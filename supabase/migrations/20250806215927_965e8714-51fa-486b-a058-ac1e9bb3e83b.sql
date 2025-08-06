-- Add unique constraint on player_id for upsert to work
ALTER TABLE public.event_stats ADD CONSTRAINT event_stats_player_id_unique UNIQUE (player_id);

-- Fix the type mismatch - convert event_stats.player_id to bigint to match players.id
ALTER TABLE public.event_stats ALTER COLUMN player_id TYPE bigint USING player_id::bigint;