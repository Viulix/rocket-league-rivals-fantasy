-- First drop the generated column
ALTER TABLE public.player_event_stats DROP COLUMN total_stats;

-- Update player_event_stats table to use decimal for stats and add saves
ALTER TABLE public.player_event_stats 
ALTER COLUMN goals TYPE decimal(8,2),
ALTER COLUMN assists TYPE decimal(8,2), 
ALTER COLUMN score TYPE decimal(8,2);

-- Add saves column
ALTER TABLE public.player_event_stats 
ADD COLUMN saves decimal(8,2) DEFAULT 0;

-- Recreate the generated column with decimal types
ALTER TABLE public.player_event_stats 
ADD COLUMN total_stats decimal(8,2) GENERATED ALWAYS AS (goals + assists + saves) STORED;