import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface AdminEventManagerProps {
  onEventAdded?: () => void;
}

export default function AdminEventManager({ onEventAdded }: AdminEventManagerProps) {
  const [eventName, setEventName] = useState("");
  const [ballchasingLink, setBallchasingLink] = useState("");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("18:00");
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

    if (!startDate || !endDate) {
      toast({
        title: "Error",
        description: "Please provide both start and end dates",
        variant: "destructive",
      });
      return;
    }

    // Combine date and time
    const [startHours, startMinutes] = startTime.split(':').map(Number);
    const [endHours, endMinutes] = endTime.split(':').map(Number);
    
    const startDateTime = new Date(startDate);
    startDateTime.setHours(startHours, startMinutes, 0, 0);
    
    const endDateTime = new Date(endDate);
    endDateTime.setHours(endHours, endMinutes, 0, 0);

    if (startDateTime >= endDateTime) {
      toast({
        title: "Error",
        description: "Start date/time must be before end date/time",
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
          eventName: eventName.trim(),
          startsAt: startDateTime.toISOString(),
          endsAt: endDateTime.toISOString()
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
        setStartDate(undefined);
        setEndDate(undefined);
        setStartTime("10:00");
        setEndTime("18:00");
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date & Time</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                    disabled={isLoading}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : <span>Pick start date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label>End Date & Time</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                    disabled={isLoading}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP") : <span>Pick end date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                disabled={isLoading}
              />
            </div>
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