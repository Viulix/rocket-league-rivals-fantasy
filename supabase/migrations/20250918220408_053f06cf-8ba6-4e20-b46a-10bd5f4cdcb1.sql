-- Drop existing event_stats table as we'll restructure the relationships
DROP TABLE IF EXISTS public.event_stats;

-- Update events table to store ballchasing group info
ALTER TABLE public.events 
DROP COLUMN IF EXISTS stats,
DROP COLUMN IF EXISTS available_players,
ADD COLUMN IF NOT EXISTS ballchasing_group_id TEXT,
ADD COLUMN IF NOT EXISTS description TEXT;

-- Create new player_event_stats table to store player performance per event
CREATE TABLE public.player_event_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id BIGINT NOT NULL,
  event_id UUID NOT NULL,
  price BIGINT NOT NULL DEFAULT 1200,
  goals INTEGER DEFAULT 0,
  assists INTEGER DEFAULT 0,
  score INTEGER DEFAULT 0,
  total_stats INTEGER GENERATED ALWAYS AS (goals + assists + score) STORED,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(player_id, event_id)
);

-- Enable RLS on player_event_stats
ALTER TABLE public.player_event_stats ENABLE ROW LEVEL SECURITY;

-- Create policies for player_event_stats
CREATE POLICY "Player event stats are viewable by everyone" 
ON public.player_event_stats 
FOR SELECT 
USING (true);

-- Only admins can insert/update/delete player event stats (for now allowing everyone until we implement admin roles)
CREATE POLICY "Everyone can manage player event stats" 
ON public.player_event_stats 
FOR ALL 
USING (true);

-- Add trigger for updating updated_at
CREATE TRIGGER update_player_event_stats_updated_at
BEFORE UPDATE ON public.player_event_stats
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update events table policies to allow creating events
DROP POLICY IF EXISTS "Events are viewable by everyone" ON public.events;

CREATE POLICY "Events are viewable by everyone" 
ON public.events 
FOR SELECT 
USING (true);

CREATE POLICY "Everyone can create events" 
ON public.events 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Everyone can update events" 
ON public.events 
FOR UPDATE 
USING (true);

-- Update players table policies to allow creating players
DROP POLICY IF EXISTS "Players are viewable by everyone" ON public.players;

CREATE POLICY "Players are viewable by everyone" 
ON public.players 
FOR SELECT 
USING (true);

CREATE POLICY "Everyone can create players" 
ON public.players 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Everyone can update players" 
ON public.players 
FOR UPDATE 
USING (true);