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

// Mock player data - will be replaced with Supabase data
const mockPlayers = [
	{
		id: 1,
		name: "jstn",
		team: "NRG",
		position: "Striker",
		price: 2500,
		score: 1245,
		goals: 89,
		assists: 67,
		saves: 23,
		goldenGoals: 12,
	},
	{
		id: 2,
		name: "GarrettG",
		team: "NRG",
		position: "Support",
		price: 2200,
		score: 1156,
		goals: 45,
		assists: 89,
		saves: 56,
		goldenGoals: 8,
	},
	{
		id: 3,
		name: "SquishyMuffinz",
		team: "NRG",
		position: "Defense",
		price: 2300,
		score: 1198,
		goals: 34,
		assists: 78,
		saves: 134,
		goldenGoals: 5,
	},
	{
		id: 4,
		name: "Aztral",
		team: "BDS",
		position: "Striker",
		price: 2400,
		score: 1187,
		goals: 92,
		assists: 56,
		saves: 18,
		goldenGoals: 15,
	},
	{
		id: 5,
		name: "Monkey M.",
		team: "BDS",
		position: "Support",
		price: 2100,
		score: 1098,
		goals: 38,
		assists: 95,
		saves: 67,
		goldenGoals: 7,
	},
	{
		id: 6,
		name: "ExoTiiK",
		team: "BDS",
		position: "Defense",
		price: 2000,
		score: 1034,
		goals: 25,
		assists: 71,
		saves: 156,
		goldenGoals: 3,
	},
	{
		id: 7,
		name: "Joyo",
		team: "G2",
		position: "Striker",
		price: 2300,
		score: 1167,
		goals: 78,
		assists: 62,
		saves: 31,
		goldenGoals: 11,
	},
	{
		id: 8,
		name: "Chicago",
		team: "G2",
		position: "Support",
		price: 2000,
		score: 1087,
		goals: 42,
		assists: 84,
		saves: 49,
		goldenGoals: 6,
	},
];

const Fantasy = () => {
	const [selectedPlayers, setSelectedPlayers] = useState<typeof mockPlayers>([]);
	const [budget] = useState(12000);
	const [user, setUser] = useState<User | null>(null);
	const [loading, setLoading] = useState(true);
	const [leagues, setLeagues] = useState<any[]>([]);
	const [currentLeague, setCurrentLeague] = useState<string>("");
	const [teamName, setTeamName] = useState<string>("My Team");
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
				setSelectedPlayers(data.selected_players as typeof mockPlayers);
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
							selected_players: selectedPlayers,
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

	// Calculate team rating based on total score
	const getTeamRating = () => {
		if (selectedPlayers.length === 0) return { grade: 'F', color: 'text-muted-foreground' };

		const totalScore = selectedPlayers.reduce((sum, player) => sum + player.score, 0);
		const avgScore = totalScore / selectedPlayers.length;

		if (avgScore >= 1200) return { grade: 'S', color: 'text-green-400' };
		if (avgScore >= 1100) return { grade: 'A', color: 'text-blue-400' };
		if (avgScore >= 1000) return { grade: 'B', color: 'text-yellow-400' };
		if (avgScore >= 900) return { grade: 'C', color: 'text-orange-400' };
		return { grade: 'D', color: 'text-red-400' };
	};

	const teamRating = getTeamRating();

	const addPlayer = (player: typeof mockPlayers[0]) => {
		if (selectedPlayers.length >= maxPlayers) return;
		if (totalCost + player.price > budget) return;
		if (selectedPlayers.find(p => p.id === player.id)) return;

		setSelectedPlayers([...selectedPlayers, player]);
	};

	const removePlayer = (playerId: number) => {
		setSelectedPlayers(selectedPlayers.filter(p => p.id !== playerId));
	};

	const availablePlayers = mockPlayers.filter(
		player => !selectedPlayers.find(p => p.id === player.id)
	);

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
														{player.team} • {player.position}
													</div>
													<div className="text-xs text-muted-foreground mt-1">
														G: {player.goals} | A: {player.assists} | S: {player.saves} | GG: {player.goldenGoals}
													</div>
												</div>
												<div className="text-right">
													<div className="font-bold text-primary">${player.price.toLocaleString()}</div>
													<div className="text-xs text-muted-foreground">{player.score} pts</div>
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
											: "Select players to add to your fantasy team"}
									</CardDescription>
								</CardHeader>
								<CardContent>
									{!currentLeague ? (
										<div className="text-center py-12">
											<p className="text-muted-foreground">Please select a league to view available players</p>
										</div>
									) : (
										<div className="grid md:grid-cols-2 gap-4">
											{availablePlayers.map((player) => {
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
																	{player.team} • {player.position}
																</p>
																<div className="text-xs text-muted-foreground mt-1">
																	G: {player.goals} | A: {player.assists} | S: {player.saves} | GG: {player.goldenGoals}
																</div>
															</div>
															<Badge variant="outline" className="text-xs">
																{player.score} pts
															</Badge>
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