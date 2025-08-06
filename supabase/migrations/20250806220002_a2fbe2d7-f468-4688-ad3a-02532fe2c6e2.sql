-- Add unique constraint on player_id for upsert to work
ALTER TABLE public.event_stats ADD CONSTRAINT event_stats_player_id_unique UNIQUE (player_id);