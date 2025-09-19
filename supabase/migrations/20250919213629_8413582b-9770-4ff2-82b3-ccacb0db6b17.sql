-- Add event_id to fantasy_teams table to make teams specific to each event within each league
ALTER TABLE public.fantasy_teams 
ADD COLUMN event_id UUID REFERENCES public.events(id);

-- Drop the existing unique constraint and create a new one that includes event_id
-- First, drop the existing constraint if it exists
DO $$ BEGIN
    ALTER TABLE public.fantasy_teams DROP CONSTRAINT IF EXISTS fantasy_teams_user_id_league_id_key;
EXCEPTION 
    WHEN undefined_object THEN NULL;
END $$;

-- Create new unique constraint for user_id, league_id, and event_id combination
ALTER TABLE public.fantasy_teams 
ADD CONSTRAINT fantasy_teams_user_id_league_id_event_id_key 
UNIQUE (user_id, league_id, event_id);