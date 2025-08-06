-- Fix event_stats table constraint issue
ALTER TABLE public.event_stats DROP CONSTRAINT IF EXISTS event_stats_player_id_unique;

-- Add unique constraint on player_id for upsert to work  
ALTER TABLE public.event_stats ADD CONSTRAINT event_stats_player_id_unique UNIQUE (player_id);

-- Ensure players table has proper referencing for event_stats
-- Since players.id is bigint, we need to make sure event_stats.player_id matches
ALTER TABLE public.event_stats ALTER COLUMN player_id TYPE bigint;