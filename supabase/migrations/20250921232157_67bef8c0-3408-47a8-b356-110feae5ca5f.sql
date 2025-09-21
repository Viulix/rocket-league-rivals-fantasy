-- Add end date column to events table
ALTER TABLE public.events 
ADD COLUMN ends_at DATE;