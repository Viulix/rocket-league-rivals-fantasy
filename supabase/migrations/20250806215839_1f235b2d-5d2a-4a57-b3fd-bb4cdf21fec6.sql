-- Fix event_stats table to have proper unique constraint for upsert
ALTER TABLE public.event_stats DROP CONSTRAINT IF EXISTS event_stats_player_id_key;

-- Add unique constraint on player_id for upsert to work
ALTER TABLE public.event_stats ADD CONSTRAINT event_stats_player_id_unique UNIQUE (player_id);

-- Fix players table to use UUID instead of bigint for consistency
ALTER TABLE public.players ALTER COLUMN id TYPE UUID USING gen_random_uuid();
ALTER TABLE public.players ALTER COLUMN id SET DEFAULT gen_random_uuid();