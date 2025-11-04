-- Add image support to events table

-- Add image columns to events table
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS banner_image text,
ADD COLUMN IF NOT EXISTS logo_image text,
ADD COLUMN IF NOT EXISTS cover_image text;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS events_banner_image_idx ON public.events(banner_image);
CREATE INDEX IF NOT EXISTS events_logo_image_idx ON public.events(logo_image);
CREATE INDEX IF NOT EXISTS events_cover_image_idx ON public.events(cover_image);

-- Update the events table to include image fields in the schema
COMMENT ON COLUMN public.events.banner_image IS 'Main banner/hero image for the event';
COMMENT ON COLUMN public.events.logo_image IS 'Event logo/icon image';
COMMENT ON COLUMN public.events.cover_image IS 'Cover image for event cards';
