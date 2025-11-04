-- Migration: Auto-create user profiles when auth users are created
-- This ensures every authenticated user has a corresponding profile record

-- Function to create user profile when auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (
    id,
    email,
    display_name,
    role,
    total_xp,
    level,
    rank,
    skills,
    social_links,
    onboarding_completed,
    email_verified,
    auth_provider,
    is_suspended,
    kyc_completed,
    kyc_status,
    verification_level,
    newsletter_subscribed,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
    'VISITOR',
    0,
    1,
    'Newcomer',
    ARRAY[]::text[],
    '{}'::jsonb,
    false,
    NEW.email_confirmed_at IS NOT NULL,
    'email',
    false,
    false,
    'pending',
    0,
    true,
    NOW(),
    NOW()
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create user profile
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.users TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.user_statistics TO postgres, anon, authenticated, service_role;

-- Create user statistics for existing users who don't have them
INSERT INTO public.user_statistics (user_id)
SELECT u.id
FROM public.users u
LEFT JOIN public.user_statistics us ON u.id = us.user_id
WHERE us.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;
