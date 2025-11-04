-- Add missing columns to events table for comprehensive event management

-- Add location_type column
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS location_type text DEFAULT 'physical' 
CHECK (location_type = ANY (ARRAY['online'::text, 'physical'::text, 'hybrid'::text]));

-- Add short_id column for better referencing
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS short_id bigint GENERATED ALWAYS AS IDENTITY;

-- Create unique index on short_id
CREATE UNIQUE INDEX IF NOT EXISTS events_short_id_idx ON public.events(short_id);

-- Add check_in_code column if it doesn't exist
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS check_in_code text;

-- Update existing events to have location_type based on location content
UPDATE public.events 
SET location_type = CASE 
  WHEN location ILIKE '%online%' OR location ILIKE '%zoom%' OR location ILIKE '%discord%' OR location ILIKE '%meet%' THEN 'online'
  WHEN location ILIKE '%hybrid%' THEN 'hybrid'
  ELSE 'physical'
END
WHERE location_type IS NULL;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS events_event_date_idx ON public.events(event_date);
CREATE INDEX IF NOT EXISTS events_event_type_idx ON public.events(event_type);
CREATE INDEX IF NOT EXISTS events_skill_level_idx ON public.events(skill_level);
CREATE INDEX IF NOT EXISTS events_status_idx ON public.events(status);
CREATE INDEX IF NOT EXISTS events_is_public_idx ON public.events(is_public);
CREATE INDEX IF NOT EXISTS events_is_featured_idx ON public.events(is_featured);
CREATE INDEX IF NOT EXISTS events_creator_id_idx ON public.events(creator_id);

-- Add RLS policies for events
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Policy for SELECT: Allow all authenticated users to read published events
CREATE POLICY "Allow authenticated users to read published events"
ON public.events FOR SELECT
TO authenticated
USING (status = 'published' AND is_public = true);

-- Policy for INSERT: Allow authenticated users to create events
CREATE POLICY "Allow authenticated users to create events"
ON public.events FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = creator_id);

-- Policy for UPDATE: Allow creators to update their own events
CREATE POLICY "Allow creators to update their own events"
ON public.events FOR UPDATE
TO authenticated
USING (auth.uid() = creator_id)
WITH CHECK (auth.uid() = creator_id);

-- Policy for DELETE: Allow creators to delete their own events
CREATE POLICY "Allow creators to delete their own events"
ON public.events FOR DELETE
TO authenticated
USING (auth.uid() = creator_id);

-- Add RLS policies for bookings
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Policy for SELECT: Allow users to read their own bookings
CREATE POLICY "Allow users to read their own bookings"
ON public.bookings FOR SELECT
TO authenticated
USING (auth.uid() = attendee_id);

-- Policy for INSERT: Allow authenticated users to create bookings
CREATE POLICY "Allow authenticated users to create bookings"
ON public.bookings FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = attendee_id);

-- Policy for UPDATE: Allow users to update their own bookings
CREATE POLICY "Allow users to update their own bookings"
ON public.bookings FOR UPDATE
TO authenticated
USING (auth.uid() = attendee_id)
WITH CHECK (auth.uid() = attendee_id);

-- Policy for DELETE: Allow users to delete their own bookings
CREATE POLICY "Allow users to delete their own bookings"
ON public.bookings FOR DELETE
TO authenticated
USING (auth.uid() = attendee_id);
