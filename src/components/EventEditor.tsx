import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { CalendarIcon, Save, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface EventEditorProps {
  event: any;
  onCancel: () => void;
  onSave: () => void;
}

export default function EventEditor({ event, onCancel, onSave }: EventEditorProps) {
  const [name, setName] = useState(event.name || "");
  const [description, setDescription] = useState(event.description || "");
  const [startDateTime, setStartDateTime] = useState<Date | undefined>(
    event.starts_at ? new Date(event.starts_at) : undefined
  );
  const [endDateTime, setEndDateTime] = useState<Date | undefined>(
    event.ends_at ? new Date(event.ends_at) : undefined
  );
  const [startTime, setStartTime] = useState(
    event.starts_at ? format(new Date(event.starts_at), "HH:mm") : "10:00"
  );
  const [endTime, setEndTime] = useState(
    event.ends_at ? format(new Date(event.ends_at), "HH:mm") : "18:00"
  );
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        title: "Error",
        description: "Event name is required",
        variant: "destructive",
      });
      return;
    }

    let starts_at = null;
    let ends_at = null;

    if (startDateTime) {
      const [hours, minutes] = startTime.split(':').map(Number);
      const startDate = new Date(startDateTime);
      startDate.setHours(hours, minutes, 0, 0);
      starts_at = startDate.toISOString();
    }

    if (endDateTime) {
      const [hours, minutes] = endTime.split(':').map(Number);
      const endDate = new Date(endDateTime);
      endDate.setHours(hours, minutes, 0, 0);
      ends_at = endDate.toISOString();
    }

    if (starts_at && ends_at && new Date(starts_at) >= new Date(ends_at)) {
      toast({
        title: "Error",
        description: "Start date/time must be before end date/time",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('events')
        .update({
          name: name.trim(),
          description: description.trim() || null,
          starts_at,
          ends_at
        })
        .eq('id', event.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Event updated successfully",
      });

      onSave();
    } catch (error) {
      console.error('Error updating event:', error);
      toast({
        title: "Error",
        description: "Failed to update event",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Edit Event
          <div className="flex gap-2">
            <Button onClick={onCancel} variant="outline" size="sm" disabled={isLoading}>
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
            <Button onClick={handleSave} size="sm" disabled={isLoading}>
              <Save className="h-4 w-4 mr-1" />
              Save
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Event Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Event name"
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description (Optional)</Label>
          <Input
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Event description"
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
                    !startDateTime && "text-muted-foreground"
                  )}
                  disabled={isLoading}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDateTime ? format(startDateTime, "PPP") : <span>Pick date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDateTime}
                  onSelect={setStartDateTime}
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
                    !endDateTime && "text-muted-foreground"
                  )}
                  disabled={isLoading}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDateTime ? format(endDateTime, "PPP") : <span>Pick date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={endDateTime}
                  onSelect={setEndDateTime}
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
      </CardContent>
    </Card>
  );
}