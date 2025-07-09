import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { User } from "@supabase/supabase-js";

// Mock player data for scoring calculation
const mockPlayers = [
  { id: 1, name: "jstn", team: "NRG", position: "Striker", price: 2500, score: 1245, goals: 89, assists: 67, saves: 23, goldenGoals: 12 },
  { id: 2, name: "GarrettG", team: "NRG", position: "Support", price: 2200, score: 1156, goals: 45, assists: 89, saves: 56, goldenGoals: 8 },
  { id: 3, name: "SquishyMuffinz", team: "NRG", position: "Defense", price: 2300, score: 1198, goals: 34, assists: 78, saves: 134, goldenGoals: 5 },
  { id: 4, name: "Aztral", team: "BDS", position: "Striker", price: 2400, score: 1187, goals: 92, assists: 56, saves: 18, goldenGoals: 15 },
  { id: 5, name: "Monkey M.", team: "BDS", position: "Support", price: 2100, score: 1098, goals: 38, assists: 95, saves: 67, goldenGoals: 7 },
  { id: 6, name: "ExoTiiK", team: "BDS", position: "Defense", price: 2000, score: 1034, goals: 25, assists: 71, saves: 156, goldenGoals: 3 },
  { id: 7, name: "Joyo", team: "G2", position: "Striker", price: 2300, score: 1167, goals: 78, assists: 62, saves: 31, goldenGoals: 11 },
  { id: 8, name: "Chicago", team: "G2", position: "Support", price: 2000, score: 1087, goals: 42, assists: 84, saves: 49, goldenGoals: 6 },
];

interface LeaderboardTeam {
  team_name: string;
  user_id: string;
  selected_players: any[];
  total_cost: number;
  total_points: number;
  grade: string;
  owner_name: string;
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
            const mockPlayer = mockPlayers.find(p => p.id === player.id);
            if (!mockPlayer) return null;
            
            return (
              <div key={player.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex-1">
                  <div className="font-medium text-foreground">{mockPlayer.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {mockPlayer.team} • {mockPlayer.position}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    G: {mockPlayer.goals} | A: {mockPlayer.assists} | S: {mockPlayer.saves} | GG: {mockPlayer.goldenGoals}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-primary">${mockPlayer.price.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">{mockPlayer.score} pts</div>
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

const Leaderboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<LeaderboardTeam[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<LeaderboardTeam | null>(null);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
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
    if (user) {
      loadGlobalLeague();
    }
  }, [user]);

  const loadGlobalLeague = async () => {
    try {
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

      // Get all teams in global league
      const { data: teamsData, error: teamsError } = await supabase
        .from('fantasy_teams')
        .select('team_name, user_id, selected_players, total_cost')
        .eq('league_id', globalLeague.id);

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
            const totalPoints = players.reduce((sum, player) => {
              const mockPlayer = mockPlayers.find(p => p.id === player.id);
              return sum + (mockPlayer?.score || 0);
            }, 0);

            const avgScore = players.length > 0 ? totalPoints / players.length : 0;
            let grade = 'F';
            if (avgScore >= 1200) grade = 'S';
            else if (avgScore >= 1100) grade = 'A';
            else if (avgScore >= 1000) grade = 'B';
            else if (avgScore >= 900) grade = 'C';
            else if (avgScore >= 800) grade = 'D';

            // Find the owner's profile
            const profile = profilesData?.find(p => p.user_id === team.user_id);

            return {
              team_name: team.team_name || 'Unnamed Team',
              user_id: team.user_id,
              selected_players: players,
              total_cost: team.total_cost,
              total_points: totalPoints,
              grade,
              owner_name: profile?.display_name || 'Unknown Player'
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
    <div className="min-h-screen bg-background font-roboto">
      <Navigation />
      <div className="p-4">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8 text-center animate-fade-in">
            <h1 className="text-4xl font-bold mb-2 bg-gradient-primary bg-clip-text text-transparent">
              Global League Leaderboard
            </h1>
            <p className="text-muted-foreground">
              See how your team ranks against players worldwide
            </p>
          </div>

          <Card className="bg-gradient-card border-border shadow-card animate-scale-in hover:shadow-glow transition-all duration-300">
            <CardHeader>
              <CardTitle className="text-foreground">Top Fantasy Teams</CardTitle>
              <CardDescription>
                Teams are ranked by total points scored by selected players
              </CardDescription>
            </CardHeader>
            <CardContent>
              {teams.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No teams found in the global league</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Team Name</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead className="text-right">Points</TableHead>
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