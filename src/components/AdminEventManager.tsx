import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface AdminEventManagerProps {
  onEventAdded?: () => void;
}

export default function AdminEventManager({ onEventAdded }: AdminEventManagerProps) {
  const [eventName, setEventName] = useState("");
  const [ballchasingLink, setBallchasingLink] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const extractGroupId = (link: string) => {
    // Extract group ID from ballchasing.com URL
    // https://ballchasing.com/group/world-championship-g0fibe4833 -> world-championship-g0fibe4833
    const match = link.match(/ballchasing\.com\/group\/([^\/\?]+)/);
    return match ? match[1] : null;
  };

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!eventName.trim() || !ballchasingLink.trim()) {
      toast({
        title: "Error",
        description: "Please provide both event name and ballchasing group link",
        variant: "destructive",
      });
      return;
    }

    const groupId = extractGroupId(ballchasingLink);
    if (!groupId) {
      toast({
        title: "Error",
        description: "Invalid ballchasing group link. Please provide a valid group URL.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      console.log("Calling fetch-ballchasing-players function with:", { groupId, eventName });
      
      const { data, error } = await supabase.functions.invoke('fetch-ballchasing-players', {
        body: {
          groupId: groupId,
          eventName: eventName.trim()
        }
      });

      if (error) {
        console.error("Function error:", error);
        throw error;
      }

      console.log("Function response:", data);

      if (data.success) {
        toast({
          title: "Event Added",
          description: data.message,
        });
        setEventName("");
        setBallchasingLink("");
        // Trigger callback to refresh events list
        onEventAdded?.();
      } else {
        throw new Error(data.error || "Failed to add event");
      }
    } catch (error) {
      console.error("Error adding event:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to add event. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Add New Event</CardTitle>
        <CardDescription>
          Import players from a Ballchasing group to create a new event
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleAddEvent} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="eventName">Event Name</Label>
            <Input
              id="eventName"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              placeholder="e.g., EU Regional 1"
              disabled={isLoading}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="ballchasingLink">Ballchasing Group Link</Label>
            <Input
              id="ballchasingLink"
              value={ballchasingLink}
              onChange={(e) => setBallchasingLink(e.target.value)}
              placeholder="https://ballchasing.com/group/world-championship-g0fibe4833"
              disabled={isLoading}
            />
          </div>

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding Event...
              </>
            ) : (
              "Add Event"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}