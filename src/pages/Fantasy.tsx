import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/Navigation";
import LeagueManagement from "@/components/LeagueManagement";
import { User } from "@supabase/supabase-js";

// Player and stats interfaces
interface Player {
	id: string;
	name: string;
	platform_id: string;
}

interface EventStats {
	id: string;
	player_id: string;
	stats: any;
	price: number;
}

interface PlayerWithStats extends Player {
	price: number;
	stats: any;
}

const Fantasy = () => {
	const [selectedPlayers, setSelectedPlayers] = useState<PlayerWithStats[]>([]);
	const [availablePlayers, setAvailablePlayers] = useState<PlayerWithStats[]>([]);
	const [budget] = useState(12000);
	const [user, setUser] = useState<User | null>(null);
	const [loading, setLoading] = useState(true);
	const [leagues, setLeagues] = useState<any[]>([]);
	const [currentLeague, setCurrentLeague] = useState<string>("");
	const [teamName, setTeamName] = useState<string>("My Team");
	const [events, setEvents] = useState<any[]>([]);
	const [currentEvent, setCurrentEvent] = useState<string>("");
	const navigate = useNavigate();
	const { toast } = useToast();

	const totalCost = selectedPlayers.reduce((sum, player) => sum + player.price, 0);
	const remainingBudget = budget - totalCost;
	const maxPlayers = 6;

	useEffect(() => {
		const { data: { subscription } } = supabase.auth.onAuthStateChange(
			(event, session) => {
				setUser(session?.user ?? null);
				if (!session) {
					navigate("/login");
				} else {
					loadUserLeagues(session.user.id);
				}
				setLoading(false);
			}
		);

		supabase.auth.getSession().then(({ data: { session } }) => {
			setUser(session?.user ?? null);
			if (!session) {
				navigate("/login");
			} else {
				loadUserLeagues(session.user.id);
			}
			setLoading(false);
		});

		return () => subscription.unsubscribe();
	}, [navigate]);

	const loadUserLeagues = async (userId: string) => {
		try {
			// Get all leagues the user is a member of
			const { data: memberships, error: membershipsError } = await supabase
				.from('league_memberships')
				.select(`
          league_id,
          leagues (
            id,
            name,
            is_global
          )
        `)
				.eq('user_id', userId);

			if (membershipsError) {
				console.error('Error loading league memberships:', membershipsError);
				return;
			}

			// Get the global league separately to ensure it's always available
			const { data: globalLeague, error: globalError } = await supabase
				.from('leagues')
				.select('id, name, is_global')
				.eq('is_global', true)
				.single();

			if (globalError) {
				console.error('Error loading global league:', globalError);
				return;
			}

			// Combine user leagues with global league
			const userLeagues = memberships?.map(m => m.leagues).filter(Boolean) || [];
			const allLeagues = [globalLeague, ...userLeagues.filter(league => !league.is_global)];

			setLeagues(allLeagues);

			// Don't auto-select any league - user must choose explicitly
			setCurrentLeague('');
			setSelectedPlayers([]);
			setTeamName('My Team');
		} catch (error) {
			console.error('Error loading leagues:', error);
		}
	};

	const loadTeam = async (userId: string, leagueId: string) => {
		try {
			const { data, error } = await supabase
				.from('fantasy_teams')
				.select('*')
				.eq('user_id', userId)
				.eq('league_id', leagueId)
				.maybeSingle();

			if (error && error.code !== 'PGRST116') {
				console.error('Error loading team:', error);
				return;
			}

			if (data) {
				setSelectedPlayers((data.selected_players as unknown) as PlayerWithStats[]);
				setTeamName(data.team_name || 'My Team');
			} else {
				setSelectedPlayers([]);
				setTeamName('My Team');
			}
		} catch (error) {
			console.error('Error loading team:', error);
		}
	};

	// Auto-save when selectedPlayers, teamName, or currentLeague changes
	useEffect(() => {
		if (user && currentLeague && currentLeague !== '' && !loading) {
			const saveTeamAuto = async () => {
				try {
					const { error } = await supabase
						.from('fantasy_teams')
						.upsert({
							user_id: user.id,
							league_id: currentLeague,
							team_name: teamName,
							selected_players: selectedPlayers as any,
							total_cost: totalCost,
						}, {
							onConflict: 'user_id,league_id'
						});

					if (error) {
						console.error('Auto-save error:', error);
					}
				} catch (error) {
					console.error('Auto-save error:', error);
				}
			};

			// Add a small delay to prevent too frequent saves
			const timeoutId = setTimeout(saveTeamAuto, 500);
			return () => clearTimeout(timeoutId);
		}
	}, [selectedPlayers, teamName, currentLeague, user, totalCost, loading]);

	const handleLeagueChange = (leagueId: string) => {
		if (leagueId !== currentLeague) {
			setCurrentLeague(leagueId);
			if (user && leagueId) {
				loadTeam(user.id, leagueId);
			} else {
				// Clear team if no league selected
				setSelectedPlayers([]);
				setTeamName('My Team');
			}
		}
	};

	const handleEventChange = async (eventId: string) => {
		setCurrentEvent(eventId);
		if (eventId) {
			await loadPlayersForEvent(eventId);
		} else {
			setAvailablePlayers([]);
		}
	};

	// Calculate team rating based on total value
	const getTeamRating = () => {
		if (selectedPlayers.length === 0) return { grade: 'F', color: 'text-muted-foreground' };

		const totalValue = selectedPlayers.reduce((sum, player) => sum + player.price, 0);
		const avgValue = totalValue / selectedPlayers.length;

		if (avgValue >= 2000) return { grade: 'S', color: 'text-green-400' };
		if (avgValue >= 1500) return { grade: 'A', color: 'text-blue-400' };
		if (avgValue >= 1000) return { grade: 'B', color: 'text-yellow-400' };
		if (avgValue >= 500) return { grade: 'C', color: 'text-orange-400' };
		return { grade: 'D', color: 'text-red-400' };
	};

	const teamRating = getTeamRating();

	const loadPlayersForEvent = async (eventId: string) => {
		try {
			// Direct API calls to avoid TypeScript issues with new tables
			const playersResponse = await fetch(`https://tliuublslpgztrxqalcw.supabase.co/rest/v1/players?select=*`, {
				headers: {
					'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsaXV1YmxzbHBnenRyeHFhbGN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2NjM3MjQsImV4cCI6MjA2NzIzOTcyNH0.M_IGHoMd8o_2czXnBgOB49kZilnfpl7WgjU0IZp1CsE',
					'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsaXV1YmxzbHBnenRyeHFhbGN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2NjM3MjQsImV4cCI6MjA2NzIzOTcyNH0.M_IGHoMd8o_2czXnBgOB49kZilnfpl7WgjU0IZp1CsE'
				}
			});
			const players = await playersResponse.json();

			const statsResponse = await fetch(`https://tliuublslpgztrxqalcw.supabase.co/rest/v1/event_stats?select=*`, {
				headers: {
					'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsaXV1YmxzbHBnenRyeHFhbGN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2NjM3MjQsImV4cCI6MjA2NzIzOTcyNH0.M_IGHoMd8o_2czXnBgOB49kZilnfpl7WgjU0IZp1CsE',
					'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsaXV1YmxzbHBnenRyeHFhbGN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2NjM3MjQsImV4cCI6MjA2NzIzOTcyNH0.M_IGHoMd8o_2czXnBgOB49kZilnfpl7WgjU0IZp1CsE'
				}
			});
			const eventStats = await statsResponse.json();

			// Combine players with their stats
			const playersWithStats: PlayerWithStats[] = players?.map((player: any) => {
				const stats = eventStats?.find((stat: any) => stat.player_id === player.id);
				return {
					id: player.id,
					name: player.name || 'Unknown Player',
					platform_id: player.platform_id,
					price: stats?.price || 1000,
					stats: stats?.stats || {}
				};
			}).filter((player: any) => {
				// Only include players that have stats (are part of events)
				return eventStats?.some((stat: any) => stat.player_id === player.id);
			}) || [];

			setAvailablePlayers(playersWithStats);
		} catch (error) {
			console.error('Error loading players for event:', error);
		}
	};

	const addPlayer = (player: PlayerWithStats) => {
		if (selectedPlayers.length >= maxPlayers) return;
		if (totalCost + player.price > budget) return;
		if (selectedPlayers.find(p => p.id === player.id)) return;

		setSelectedPlayers([...selectedPlayers, player]);
	};

	const removePlayer = (playerId: string) => {
		setSelectedPlayers(selectedPlayers.filter(p => p.id !== playerId));
	};

	const getFilteredAvailablePlayers = () => {
		return availablePlayers.filter(player => 
			!selectedPlayers.find(p => p.id === player.id)
		);
	};

	useEffect(() => {
		const loadEvents = async () => {
			try {
				// Direct API call to avoid TypeScript issues
				const response = await fetch(`https://tliuublslpgztrxqalcw.supabase.co/rest/v1/events?select=id,name,starts_at`, {
					headers: {
						'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsaXV1YmxzbHBnenRyeHFhbGN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2NjM3MjQsImV4cCI6MjA2NzIzOTcyNH0.M_IGHoMd8o_2czXnBgOB49kZilnfpl7WgjU0IZp1CsE',
						'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsaXV1YmxzbHBnenRyeHFhbGN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2NjM3MjQsImV4cCI6MjA2NzIzOTcyNH0.M_IGHoMd8o_2czXnBgOB49kZilnfpl7WgjU0IZp1CsE'
					}
				});
				const events = await response.json();
				setEvents(events || []);
			} catch (error) {
				console.error("Error loading events:", error);
			}
		};

		loadEvents();
	}, []);

	if (loading) {
		return (
			<div className="min-h-screen bg-background font-roboto">
				<Navigation />
				<div className="flex items-center justify-center h-96">
					<div className="text-center">
						<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
						<p className="text-muted-foreground">Loading your team...</p>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-background" style={{ fontFamily: "var(--font-family)" }}>
			<Navigation />
			<div className="p-4">
				<div className="max-w-7xl mx-auto">
					<div className="mb-8 text-center animate-fade-in">
						<h1
							className="text-4xl font-bold mb-2 bg-gradient-primary bg-clip-text text-transparent"
							style={{ fontFamily: "var(--font-family)" }}
						>
							Fantasy Team Builder
						</h1>
						<p className="text-muted-foreground" style={{ fontFamily: "var(--font-family)" }}>
							Build your ultimate Rocket League fantasy team within budget
						</p>
					</div>

					{/* Event Selection */}
					<div className="mb-6">
						<Card className="bg-gradient-card border-border shadow-card animate-scale-in hover:shadow-glow transition-all duration-300">
							<CardHeader className="pb-3">
								<CardTitle className="text-lg text-foreground">Event Selection</CardTitle>
							</CardHeader>
							<CardContent>
								<Select value={currentEvent} onValueChange={handleEventChange}>
									<SelectTrigger className="bg-input border-border">
										<SelectValue placeholder="Select an event to filter players" />
									</SelectTrigger>
									<SelectContent>
										{events.map(event => (
											<SelectItem key={event.id} value={event.id}>
												{event.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</CardContent>
						</Card>
					</div>

					{/* League and Team Settings */}
					<div className="mb-6 space-y-4">
						<div className="grid md:grid-cols-2 gap-4">
							<Card className="bg-gradient-card border-border shadow-card animate-scale-in hover:shadow-glow transition-all duration-300">
								<CardHeader className="pb-3">
									<CardTitle className="text-lg text-foreground">League Selection</CardTitle>
								</CardHeader>
								<CardContent>
									<Select value={currentLeague} onValueChange={handleLeagueChange}>
										<SelectTrigger className="bg-input border-border">
											<SelectValue placeholder="Select a league to start building your team" />
										</SelectTrigger>
										<SelectContent>
											{leagues.map((league) => (
												<SelectItem key={league.id} value={league.id}>
													{league.name} {league.is_global && '(Global)'}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</CardContent>
							</Card>

							<Card className="bg-gradient-card border-border shadow-card animate-scale-in hover:shadow-glow transition-all duration-300">
								<CardHeader className="pb-3">
									<CardTitle className="text-lg text-foreground">Team Name</CardTitle>
								</CardHeader>
								<CardContent>
									<Input
										value={teamName}
										onChange={(e) => setTeamName(e.target.value)}
										placeholder="Enter your team name"
										className="bg-input border-border"
										maxLength={50}
										disabled={!currentLeague}
									/>
								</CardContent>
							</Card>
						</div>

						<LeagueManagement
							user={user}
							leagues={leagues}
							currentLeague={currentLeague}
							onLeaguesUpdate={() => user && loadUserLeagues(user.id)}
						/>
					</div>

					<div className="grid lg:grid-cols-3 gap-6">
						{/* Team Selection */}
						<div className="lg:col-span-1">
							<Card className="bg-gradient-card border-border shadow-card animate-scale-in hover:shadow-glow transition-all duration-300 sticky top-4">
								<CardHeader>
									<CardTitle className="flex items-center justify-between text-foreground">
										<div className="flex items-center gap-2">
											{teamName}
											<Badge variant="ghost" className={`text-sm font-bold ${teamRating.color}`}>
												{teamRating.grade}
											</Badge>
										</div>
										<Badge variant="secondary" className="text-sm">
											{selectedPlayers.length}/{maxPlayers}
										</Badge>
									</CardTitle>
									<CardDescription>
										Budget: ${remainingBudget.toLocaleString()} / ${budget.toLocaleString()}
									</CardDescription>
								</CardHeader>
								<CardContent className="space-y-3">
									{selectedPlayers.length === 0 ? (
										<p className="text-muted-foreground text-center py-8">
											{!currentLeague ? 'Please select a league first' : 'No players selected yet'}
										</p>
									) : (
										selectedPlayers.map((player) => (
											<div
												key={player.id}
												className="flex items-center justify-between p-3 bg-muted rounded-lg hover:bg-muted/80 transition-all duration-200"
											>
												<div className="flex-1">
													<div className="font-medium text-foreground">{player.name}</div>
													<div className="text-xs text-muted-foreground">
														{player.platform_id}
													</div>
													<div className="text-xs text-muted-foreground mt-1">
														{player.stats && typeof player.stats === 'object' && 
															Object.entries(player.stats).map(([key, value]) => 
																`${key}: ${value}`
															).join(' | ')
														}
													</div>
												</div>
												<div className="text-right">
													<div className="font-bold text-primary">${player.price.toLocaleString()}</div>
													<Button
														variant="outline"
														size="sm"
														onClick={() => removePlayer(player.id)}
														className="mt-1 h-6 text-xs"
													>
														Remove
													</Button>
												</div>
											</div>
										))
									)}
								</CardContent>
							</Card>
						</div>

						{/* Player Pool */}
						<div className="lg:col-span-2">
							<Card className="bg-gradient-card border-border shadow-card animate-scale-in hover:shadow-glow transition-all duration-300">
								<CardHeader>
									<CardTitle className="text-foreground" style={{ fontFamily: "var(--font-family)" }}>
										Available Players
									</CardTitle>
									<CardDescription style={{ fontFamily: "var(--font-family)" }}>
										{!currentLeague
											? "Select a league first to start building your team"
											: !currentEvent
											? "Select an event to view available players"
											: "Select players to add to your fantasy team"}
									</CardDescription>
								</CardHeader>
								<CardContent>
									{!currentLeague ? (
										<div className="text-center py-12">
											<p className="text-muted-foreground">Please select a league to view available players</p>
										</div>
									) : !currentEvent ? (
										<div className="text-center py-12">
											<p className="text-muted-foreground">Please select an event to view available players</p>
										</div>
									) : availablePlayers.length === 0 ? (
										<div className="text-center py-12">
											<p className="text-muted-foreground">No players available for this event</p>
										</div>
									) : (
										<div className="grid md:grid-cols-2 gap-4">
											{getFilteredAvailablePlayers().map((player) => {
												const canAfford = totalCost + player.price <= budget;
												const hasSpace = selectedPlayers.length < maxPlayers;
												const canAdd = canAfford && hasSpace;

												return (
													<div
														key={player.id}
														className={`p-4 rounded-lg border transition-all duration-300 ${
															canAdd
																? 'border-border bg-card hover:border-primary/50 hover:shadow-md hover:-translate-y-1'
																: 'border-muted bg-muted/50 opacity-60'
														}`}
													>
														<div className="flex items-start justify-between mb-2">
															<div>
																<h3 className="font-bold text-foreground">{player.name}</h3>
																<p className="text-sm text-muted-foreground">
																	{player.platform_id}
																</p>
																<div className="text-xs text-muted-foreground mt-1">
																	{player.stats && typeof player.stats === 'object' && 
																		Object.entries(player.stats).map(([key, value]) => 
																			`${key}: ${value}`
																		).join(' | ')
																	}
																</div>
															</div>
														</div>

														<div className="flex items-center justify-between">
															<span className="font-bold text-primary text-lg">
																${player.price.toLocaleString()}
															</span>
															<Button
																variant={canAdd ? "default" : "secondary"}
																size="sm"
																onClick={() => addPlayer(player)}
																disabled={!canAdd}
																className={canAdd ? "bg-gradient-primary text-primary-foreground hover:shadow-glow hover:scale-105 transition-all duration-200" : ""}
															>
																{!hasSpace ? "Team Full" : !canAfford ? "Too Expensive" : "Add"}
															</Button>
														</div>
													</div>
												);
											})}
										</div>
									)}
								</CardContent>
							</Card>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default Fantasy;