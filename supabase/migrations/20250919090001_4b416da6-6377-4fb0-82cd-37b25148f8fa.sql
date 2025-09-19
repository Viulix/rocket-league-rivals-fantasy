-- Add foreign key constraint between player_event_stats and players
ALTER TABLE public.player_event_stats 
ADD CONSTRAINT fk_player_event_stats_player_id 
FOREIGN KEY (player_id) REFERENCES public.players(id);