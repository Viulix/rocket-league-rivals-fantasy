-- Enable RLS and add policies for players table
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players are viewable by everyone" 
ON public.players 
FOR SELECT 
USING (true);

-- Enable RLS and add policies for events table  
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Events are viewable by everyone" 
ON public.events 
FOR SELECT 
USING (true);

-- Enable RLS and add policies for event_stats table
ALTER TABLE public.event_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Event stats are viewable by everyone" 
ON public.event_stats 
FOR SELECT 
USING (true);