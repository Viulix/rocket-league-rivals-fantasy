import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, ChevronDown } from "lucide-react";
import { User } from "@supabase/supabase-js";

interface League {
  id: string;
  name: string;
  is_global: boolean;
  creator_id: string | null;
  password?: string | null;
}

interface LeagueManagementProps {
  user: User | null;
  leagues: League[];
  currentLeague: string;
  onLeaguesUpdate: () => void;
}

const LeagueManagement = ({ user, leagues, currentLeague, onLeaguesUpdate }: LeagueManagementProps) => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [newLeagueName, setNewLeagueName] = useState("");
  const [newLeaguePassword, setNewLeaguePassword] = useState("");
  const [joinLeagueName, setJoinLeagueName] = useState("");
  const [joinLeaguePassword, setJoinLeaguePassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const userCreatedLeagues = leagues.filter(league => 
    !league.is_global && league.creator_id === user?.id
  );

  const createLeague = async () => {
    if (!user || !newLeagueName.trim()) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('leagues')
        .insert({
          name: newLeagueName.trim(),
          password: newLeaguePassword.trim() || null,
          creator_id: user.id,
          is_global: false
        })
        .select()
        .single();

      if (error) throw error;

      // Auto-join the creator to their own league
      await supabase
        .from('league_memberships')
        .insert({
          user_id: user.id,
          league_id: data.id
        });

      toast({
        title: "Success",
        description: "League created successfully!"
      });
      
      setNewLeagueName("");
      setNewLeaguePassword("");
      setIsCreateOpen(false);
      onLeaguesUpdate();
    } catch (error) {
      console.error('Error creating league:', error);
      toast({
        title: "Error",
        description: "Failed to create league"
      });
    } finally {
      setLoading(false);
    }
  };

  const joinLeague = async () => {
    if (!user || !joinLeagueName.trim()) return;
    
    setLoading(true);
    try {
      // Find league by name
      const { data: leagueData, error: findError } = await supabase
        .from('leagues')
        .select('*')
        .eq('name', joinLeagueName.trim())
        .eq('is_global', false)
        .single();

      if (findError || !leagueData) {
        toast({
          title: "Error",
          description: "League not found"
        });
        return;
      }

      // Check password if league has one
      if (leagueData.password && leagueData.password !== joinLeaguePassword) {
        toast({
          title: "Error",
          description: "Incorrect password"
        });
        return;
      }

      // Check if already a member
      const { data: existingMembership } = await supabase
        .from('league_memberships')
        .select('id')
        .eq('user_id', user.id)
        .eq('league_id', leagueData.id)
        .single();

      if (existingMembership) {
        toast({
          title: "Info",
          description: "You are already a member of this league"
        });
        return;
      }

      // Join the league
      const { error: joinError } = await supabase
        .from('league_memberships')
        .insert({
          user_id: user.id,
          league_id: leagueData.id
        });

      if (joinError) throw joinError;

      toast({
        title: "Success",
        description: "Joined league successfully!"
      });
      
      setJoinLeagueName("");
      setJoinLeaguePassword("");
      setIsJoinOpen(false);
      onLeaguesUpdate();
    } catch (error) {
      console.error('Error joining league:', error);
      toast({
        title: "Error",
        description: "Failed to join league"
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteLeague = async (leagueId: string) => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('leagues')
        .delete()
        .eq('id', leagueId)
        .eq('creator_id', user.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "League deleted successfully!"
      });
      
      onLeaguesUpdate();
    } catch (error) {
      console.error('Error deleting league:', error);
      toast({
        title: "Error",
        description: "Failed to delete league"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-gradient-card border-border shadow-card overflow-hidden">
      <Collapsible open={!isCollapsed} onOpenChange={(open) => setIsCollapsed(!open)}>
        <CollapsibleTrigger asChild>
          <CardHeader className={`pb-3 cursor-pointer transition-smooth group ${
            !isCollapsed 
              ? 'bg-muted/30 border-b border-border' 
              : 'hover:bg-muted/20 hover:shadow-lg'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg text-foreground group-hover:text-primary transition-smooth">
                  League Management
                </CardTitle>
                <CardDescription>Create or join custom leagues</CardDescription>
              </div>
              <div className={`transition-smooth ${
                !isCollapsed 
                  ? 'bg-primary/10 rounded-full p-1' 
                  : 'group-hover:bg-muted/20 rounded-full p-1'
              }`}>
                <ChevronDown className={`h-4 w-4 transition-smooth ${
                  isCollapsed ? 'group-hover:scale-110' : 'rotate-180 text-primary'
                }`} />
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent className="data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down overflow-hidden">
          <CardContent className="space-y-4 pt-4 bg-gradient-to-b from-card to-muted/10">
        <div className="flex gap-2">
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2 hover:scale-105 transition-smooth">
                <Plus className="h-4 w-4" />
                Create League
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New League</DialogTitle>
                <DialogDescription>
                  Create a custom league with a name and optional password
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="league-name">League Name</Label>
                  <Input
                    id="league-name"
                    value={newLeagueName}
                    onChange={(e) => setNewLeagueName(e.target.value)}
                    placeholder="Enter league name"
                    maxLength={50}
                  />
                </div>
                <div>
                  <Label htmlFor="league-password">Password (Optional)</Label>
                  <Input
                    id="league-password"
                    type="password"
                    value={newLeaguePassword}
                    onChange={(e) => setNewLeaguePassword(e.target.value)}
                    placeholder="Enter password (optional)"
                    maxLength={50}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={createLeague} disabled={loading || !newLeagueName.trim()} className="hover:scale-105 transition-smooth">
                    Create
                  </Button>
                  <Button variant="outline" onClick={() => setIsCreateOpen(false)} className="hover:scale-105 transition-smooth">
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isJoinOpen} onOpenChange={setIsJoinOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="hover:scale-105 transition-smooth">Join League</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Join League</DialogTitle>
                <DialogDescription>
                  Enter the league name and password to join
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="join-league-name">League Name</Label>
                  <Input
                    id="join-league-name"
                    value={joinLeagueName}
                    onChange={(e) => setJoinLeagueName(e.target.value)}
                    placeholder="Enter league name"
                  />
                </div>
                <div>
                  <Label htmlFor="join-league-password">Password</Label>
                  <Input
                    id="join-league-password"
                    type="password"
                    value={joinLeaguePassword}
                    onChange={(e) => setJoinLeaguePassword(e.target.value)}
                    placeholder="Enter password"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={joinLeague} disabled={loading || !joinLeagueName.trim()} className="hover:scale-105 transition-smooth">
                    Join
                  </Button>
                  <Button variant="outline" onClick={() => setIsJoinOpen(false)} className="hover:scale-105 transition-smooth">
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {userCreatedLeagues.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-foreground mb-2">Your Leagues</h4>
            <div className="space-y-2">
              {userCreatedLeagues.map((league) => (
                <div key={league.id} className="flex items-center justify-between p-2 bg-muted rounded hover:bg-muted/80 transition-smooth">
                  <span className="text-sm">{league.name}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteLeague(league.id)}
                    disabled={loading || league.id === currentLeague}
                    className="h-6 w-6 p-0 hover:scale-110 hover:bg-destructive/20 hover:text-destructive transition-smooth"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default LeagueManagement;