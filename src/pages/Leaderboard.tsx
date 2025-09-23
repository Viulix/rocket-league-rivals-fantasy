import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { User } from "@supabase/supabase-js";

interface PlayerStats {
  goals: number;
  assists: number;
  saves: number;
  score: number;
  demos: number;
  total: number;
}

interface LeaderboardTeam {
  team_name: string;
  user_id: string;
  selected_players: any[];
  total_cost: number;
  total_points: number;
  grade: string;
  owner_name: string;
  event_id?: string;
}

interface TeamModalProps {
  team: LeaderboardTeam | null;
  isOpen: boolean;
  onClose: () => void;
}

const TeamModal = ({ team, isOpen, onClose }: TeamModalProps) => {
  if (!team) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {team.team_name}
            <Badge variant="ghost" className={`font-bold ${getGradeColor(team.grade)}`}>
              {team.grade}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Owner: {team.owner_name} • Total Points: {team.total_points.toLocaleString()} • Cost: ${team.total_cost.toLocaleString()}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {team.selected_players.map((player, index) => {
            // Use the player data directly since it should have all the information we need
            return (
              <div key={player.id || index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex-1">
                  <div className="font-medium text-foreground">{player.name || 'Unknown Player'}</div>
                  <div className="text-xs text-muted-foreground">
                    ID: {player.id || 'N/A'}
                  </div>
                   <div className="text-xs text-muted-foreground mt-1">
                     G: {(player.stats?.goals || 0).toFixed(1)} | A: {(player.stats?.assists || 0).toFixed(1)} | S: {(player.stats?.saves || 0).toFixed(1)} | D: {(player.stats?.demos || 0).toFixed(1)} | Sc: {(player.stats?.score || 0).toFixed(0)}
                   </div>
                </div>
                 <div className="text-right">
                   <div className="font-bold text-primary">${(player.price || 1200).toLocaleString()}</div>
                   <div className="text-xs text-primary">Fantasy: {calculateFantasyScore(player.stats || {}).toFixed(1)}</div>
                 </div>
              </div>
            );
          })}
        </div>
        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Calculate fantasy score: F = Goals x 0.95 + Assists x 0.75 + 0.48 x Saves + 17 x Demos + 0.7 x Score
const calculateFantasyScore = (stats: Partial<PlayerStats>) => {
  const goals = stats.goals || 0;
  const assists = stats.assists || 0;
  const saves = stats.saves || 0;
  const demos = stats.demos || 0;
  const score = stats.score || 0;
  
  return goals * 0.95 + assists * 0.75 + saves * 0.48 + demos * 17 + score * 0.7;
};

const Leaderboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<LeaderboardTeam[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<LeaderboardTeam | null>(null);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [currentEvent, setCurrentEvent] = useState<string>("");
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        if (!session) {
          navigate("/login");
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/login");
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    if (user && currentEvent) {
      loadGlobalLeague();
    }
  }, [user, currentEvent]);

  const loadEvents = async () => {
    try {
      const response = await fetch(`https://tliuublslpgztrxqalcw.supabase.co/rest/v1/events?select=id,name,starts_at&order=created_at.desc`, {
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsaXV1YmxzbHBnenRyeHFhbGN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2NjM3MjQsImV4cCI6MjA2NzIzOTcyNH0.M_IGHoMd8o_2czXnBgOB49kZilnfpl7WgjU0IZp1CsE',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsaXV1YmxzbHBnenRyeHFhbGN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2NjM3MjQsImV4cCI6MjA2NzIzOTcyNH0.M_IGHoMd8o_2czXnBgOB49kZilnfpl7WgjU0IZp1CsE'
        }
      });
      const events = await response.json();
      setEvents(events || []);
      
      // Auto-select the first event if available
      if (events && events.length > 0) {
        setCurrentEvent(events[0].id);
      }
    } catch (error) {
      console.error("Error loading events:", error);
    }
  };

  const loadGlobalLeague = async () => {
    try {
      if (!currentEvent) return;

      // Get global league
      const { data: globalLeague, error: leagueError } = await supabase
        .from('leagues')
        .select('id')
        .eq('is_global', true)
        .single();

      if (leagueError || !globalLeague) {
        console.error('Error loading global league:', leagueError);
        return;
      }

      // Get all teams in global league for the current event
      const { data: teamsData, error: teamsError } = await supabase
        .from('fantasy_teams')
        .select('team_name, user_id, selected_players, total_cost, event_id')
        .eq('league_id', globalLeague.id)
        .eq('event_id', currentEvent);

      if (teamsError) {
        console.error('Error loading teams:', teamsError);
        return;
      }

      // Get all profiles for the team owners
      const userIds = teamsData?.map(team => team.user_id) || [];
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, display_name')
        .in('user_id', userIds);

      if (profilesError) {
        console.error('Error loading profiles:', profilesError);
        return;
      }

      if (teamsData) {
        const processedTeams = teamsData
          .map(team => {
            const players = team.selected_players as any[];
            
            // Calculate total fantasy points using the new formula
            const totalFantasyScore = players.reduce((sum, player) => {
              const stats = player.stats || {};
              return sum + calculateFantasyScore(stats);
            }, 0);

            const avgFantasyScore = players.length > 0 ? totalFantasyScore / players.length : 0;
            let grade = 'F';
            if (avgFantasyScore >= 50) grade = 'S';
            else if (avgFantasyScore >= 40) grade = 'A';
            else if (avgFantasyScore >= 30) grade = 'B';
            else if (avgFantasyScore >= 20) grade = 'C';
            else if (avgFantasyScore >= 10) grade = 'D';

            // Find the owner's profile
            const profile = profilesData?.find(p => p.user_id === team.user_id);

            return {
              team_name: team.team_name || 'Unnamed Team',
              user_id: team.user_id,
              selected_players: players,
              total_cost: team.total_cost,
              total_points: Math.round(totalFantasyScore * 100) / 100, // Round to 2 decimal places
              grade,
              owner_name: profile?.display_name || 'Unknown Player',
              event_id: team.event_id
            };
          })
          .sort((a, b) => b.total_points - a.total_points);

        setTeams(processedTeams);
      }
    } catch (error) {
      console.error('Error loading global league:', error);
    }
  };

  const openTeamModal = (team: LeaderboardTeam) => {
    setSelectedTeam(team);
    setIsTeamModalOpen(true);
  };

  const closeTeamModal = () => {
    setSelectedTeam(null);
    setIsTeamModalOpen(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background font-roboto">
        <Navigation />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading leaderboard...</p>
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
              Global Leaderboard
            </h1>
            <p className="text-muted-foreground" style={{ fontFamily: "var(--font-family)" }}>
              View the top fantasy teams ranked by fantasy points
            </p>
          </div>

          {/* Event Selection */}
          <div className="mb-6">
            <Card className="bg-gradient-card border-border shadow-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-foreground">Event Selection</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={currentEvent} onValueChange={setCurrentEvent}>
                  <SelectTrigger className="bg-input border-border">
                    <SelectValue placeholder="Select an event to view leaderboard" />
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

          <Card className="bg-gradient-card border-border shadow-card animate-scale-in hover:shadow-glow transition-all duration-300">
            <CardHeader>
              <CardTitle className="text-foreground">Top Fantasy Teams</CardTitle>
              <CardDescription>
                Teams are ranked by total fantasy points using the formula: Goals×0.95 + Assists×0.75 + Saves×0.48 + Demos×17 + Score×0.7
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!currentEvent ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Please select an event to view the leaderboard</p>
                </div>
              ) : teams.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No teams found for this event in the global league</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Team Name</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead className="text-right">Fantasy Points</TableHead>
                      <TableHead className="text-center">Grade</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teams.map((team, index) => (
                      <TableRow 
                        key={team.user_id} 
                        className="cursor-pointer hover:bg-muted/70 transition-all duration-200"
                        onClick={() => openTeamModal(team)}
                      >
                        <TableCell className="font-medium">{index + 1}</TableCell>
                        <TableCell className="font-medium text-foreground">
                          {team.team_name}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {team.owner_name}
                        </TableCell>
                        <TableCell className="text-right font-bold text-primary">
                          {team.total_points.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="ghost" className={`font-bold ${getGradeColor(team.grade)}`}>
                            {team.grade}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          ${team.total_cost.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      
      <TeamModal 
        team={selectedTeam} 
        isOpen={isTeamModalOpen} 
        onClose={closeTeamModal} 
      />
    </div>
  );
};

const getGradeColor = (grade: string) => {
  switch (grade) {
    case 'S': return 'text-green-400';
    case 'A': return 'text-blue-400';
    case 'B': return 'text-yellow-400';
    case 'C': return 'text-orange-400';
    case 'D': return 'text-red-400';
    default: return 'text-muted-foreground';
  }
};

export default Leaderboard;