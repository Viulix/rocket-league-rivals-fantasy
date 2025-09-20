-- Drop the old unique constraint that conflicts with the new per-event constraint
ALTER TABLE public.fantasy_teams DROP CONSTRAINT IF EXISTS unique_user_team_per_league;