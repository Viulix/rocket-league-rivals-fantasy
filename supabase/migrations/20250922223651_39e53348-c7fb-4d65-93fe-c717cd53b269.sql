-- Add demos column to player_event_stats table
ALTER TABLE public.player_event_stats 
ADD COLUMN demos numeric DEFAULT 0;