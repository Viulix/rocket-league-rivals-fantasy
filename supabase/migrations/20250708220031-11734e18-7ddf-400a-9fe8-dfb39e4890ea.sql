-- Add unique constraint to display_name in profiles table
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_display_name_unique UNIQUE (display_name);

-- Create function to check display name availability
CREATE OR REPLACE FUNCTION public.check_display_name_available(name TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE LOWER(display_name) = LOWER(name)
  );
$$;

-- Update the handle_new_user_complete function to include display_name from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user_complete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  global_league_id UUID;
BEGIN
  -- Create profile with display_name from metadata
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'display_name');
  
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
$function$;