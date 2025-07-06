-- Create leagues table
CREATE TABLE public.leagues (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  password TEXT, -- nullable for global league
  creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  is_global BOOLEAN DEFAULT FALSE,
  max_members INTEGER DEFAULT NULL, -- null means unlimited
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for leagues
ALTER TABLE public.leagues ENABLE ROW LEVEL SECURITY;

-- Create policies for leagues
CREATE POLICY "Everyone can view leagues" 
ON public.leagues 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create their own leagues" 
ON public.leagues 
FOR INSERT 
WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can update their own leagues" 
ON public.leagues 
FOR UPDATE 
USING (auth.uid() = creator_id);

CREATE POLICY "Creators can delete their own leagues" 
ON public.leagues 
FOR DELETE 
USING (auth.uid() = creator_id);

-- Create league memberships table (many-to-many between users and leagues)
CREATE TABLE public.league_memberships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  league_id UUID NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, league_id)
);

-- Enable RLS for league memberships
ALTER TABLE public.league_memberships ENABLE ROW LEVEL SECURITY;

-- Create policies for league memberships
CREATE POLICY "Users can view their own memberships" 
ON public.league_memberships 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can join leagues" 
ON public.league_memberships 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave leagues" 
ON public.league_memberships 
FOR DELETE 
USING (auth.uid() = user_id);

-- Update fantasy_teams table to support leagues and team names
ALTER TABLE public.fantasy_teams 
ADD COLUMN league_id UUID REFERENCES public.leagues(id) ON DELETE CASCADE;

-- Add unique constraint so each user can only have one team per league
ALTER TABLE public.fantasy_teams 
ADD CONSTRAINT unique_user_team_per_league UNIQUE(user_id, league_id);

-- Add triggers for automatic timestamp updates on new tables
CREATE TRIGGER update_leagues_updated_at
  BEFORE UPDATE ON public.leagues
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create global league
INSERT INTO public.leagues (name, is_global, creator_id) 
VALUES ('Global League', true, (SELECT id FROM auth.users LIMIT 1));

-- Function to auto-join users to global league when they sign up
CREATE OR REPLACE FUNCTION public.handle_new_user_league_membership()
RETURNS TRIGGER AS $$
DECLARE
  global_league_id UUID;
BEGIN
  -- Get the global league ID
  SELECT id INTO global_league_id 
  FROM public.leagues 
  WHERE is_global = true 
  LIMIT 1;
  
  -- Join the user to the global league
  IF global_league_id IS NOT NULL THEN
    INSERT INTO public.league_memberships (user_id, league_id)
    VALUES (NEW.id, global_league_id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the existing user creation trigger to also handle league membership
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE OR REPLACE FUNCTION public.handle_new_user_complete()
RETURNS TRIGGER AS $$
DECLARE
  global_league_id UUID;
BEGIN
  -- Create profile
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  
  -- Get the global league ID and join user to it
  SELECT id INTO global_league_id 
  FROM public.leagues 
  WHERE is_global = true 
  LIMIT 1;
  
  IF global_league_id IS NOT NULL THEN
    INSERT INTO public.league_memberships (user_id, league_id)
    VALUES (NEW.id, global_league_id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_complete();