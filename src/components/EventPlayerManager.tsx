import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, X, Search } from "lucide-react";

interface EventPlayerManagerProps {
  event: any;
  onBack: () => void;
}

export default function EventPlayerManager({ event, onBack }: EventPlayerManagerProps) {
  const [eventPlayers, setEventPlayers] = useState<any[]>([]);
  const [allPlayers, setAllPlayers] = useState<any[]>([]);
  const [filteredPlayers, setFilteredPlayers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadEventPlayers();
    loadAllPlayers();
  }, [event.id]);

  useEffect(() => {
    const filtered = allPlayers.filter(player => 
      !eventPlayers.some(ep => ep.player_id === player.id) &&
      (player.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       player.platform_id?.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setFilteredPlayers(filtered);
  }, [allPlayers, eventPlayers, searchTerm]);

  const loadEventPlayers = async () => {
    try {
      const { data, error } = await supabase
        .from('player_event_stats')
        .select(`
          *,
          players (
            id,
            name,
            platform_id
          )
        `)
        .eq('event_id', event.id);

      if (error) throw error;
      setEventPlayers(data || []);
    } catch (error) {
      console.error('Error loading event players:', error);
      toast({
        title: "Error",
        description: "Failed to load event players",
        variant: "destructive",
      });
    }
  };

  const loadAllPlayers = async () => {
    try {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .order('name');

      if (error) throw error;
      setAllPlayers(data || []);
    } catch (error) {
      console.error('Error loading players:', error);
      toast({
        title: "Error",
        description: "Failed to load players",
        variant: "destructive",
      });
    }
  };

  const addPlayerToEvent = async (player: any) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('player_event_stats')
        .insert({
          event_id: event.id,
          player_id: player.id,
          price: 1200, // default price
          goals: 0,
          assists: 0,
          saves: 0,
          score: 0,
          total_stats: 0
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: `${player.name || player.platform_id} added to event`,
      });

      loadEventPlayers();
    } catch (error) {
      console.error('Error adding player to event:', error);
      toast({
        title: "Error",
        description: "Failed to add player to event",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const removePlayerFromEvent = async (playerEventStat: any) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('player_event_stats')
        .delete()
        .eq('id', playerEventStat.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `${playerEventStat.players.name || playerEventStat.players.platform_id} removed from event`,
      });

      loadEventPlayers();
    } catch (error) {
      console.error('Error removing player from event:', error);
      toast({
        title: "Error",
        description: "Failed to remove player from event",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button onClick={onBack} variant="outline" size="sm">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Events
        </Button>
        <div>
          <h2 className="text-2xl font-bold">{event.name}</h2>
          <p className="text-muted-foreground">Manage event players</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Current Event Players */}
        <Card>
          <CardHeader>
            <CardTitle>Event Players ({eventPlayers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {eventPlayers.map((playerStat) => (
                <div key={playerStat.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <div className="font-medium">
                      {playerStat.players.name || playerStat.players.platform_id}
                    </div>
                    <div className="text-xs text-muted-foreground flex gap-2">
                      <span>Price: {playerStat.price}</span>
                      <span>Goals: {playerStat.goals}</span>
                      <span>Assists: {playerStat.assists}</span>
                    </div>
                  </div>
                  <Button
                    onClick={() => removePlayerFromEvent(playerStat)}
                    variant="outline"
                    size="sm"
                    disabled={isLoading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {eventPlayers.length === 0 && (
                <p className="text-muted-foreground text-center py-4">
                  No players in this event yet
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Available Players to Add */}
        <Card>
          <CardHeader>
            <CardTitle>Add Players</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search players..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredPlayers.map((player) => (
                <div key={player.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <div className="font-medium">
                      {player.name || player.platform_id}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Platform ID: {player.platform_id}
                    </div>
                  </div>
                  <Button
                    onClick={() => addPlayerToEvent(player)}
                    variant="outline"
                    size="sm"
                    disabled={isLoading}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {filteredPlayers.length === 0 && (
                <p className="text-muted-foreground text-center py-4">
                  {searchTerm ? "No players found matching your search" : "All players are already in this event"}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}