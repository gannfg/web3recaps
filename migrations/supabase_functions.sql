-- Supabase Functions for Vercel + Supabase Statistics System
-- These functions work perfectly with Vercel's serverless environment

-- ============================================================================
-- ATOMIC INCREMENT FUNCTION
-- ============================================================================

-- Function to atomically increment statistics fields
CREATE OR REPLACE FUNCTION increment_statistics(
  target_user_id UUID,
  field_name TEXT,
  increment_value INTEGER DEFAULT 1
)
RETURNS VOID AS $$
BEGIN
  -- Ensure user statistics record exists
  INSERT INTO public.user_statistics (user_id)
  VALUES (target_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  -- Update the specified field atomically
  CASE field_name
    WHEN 'total_posts' THEN
      UPDATE public.user_statistics 
      SET total_posts = GREATEST(total_posts + increment_value, 0),
          updated_at = now()
      WHERE user_id = target_user_id;
      
    WHEN 'total_events_created' THEN
      UPDATE public.user_statistics 
      SET total_events_created = GREATEST(total_events_created + increment_value, 0),
          updated_at = now()
      WHERE user_id = target_user_id;
      
    WHEN 'total_projects' THEN
      UPDATE public.user_statistics 
      SET total_projects = GREATEST(total_projects + increment_value, 0),
          updated_at = now()
      WHERE user_id = target_user_id;
      
    WHEN 'total_teams_created' THEN
      UPDATE public.user_statistics 
      SET total_teams_created = GREATEST(total_teams_created + increment_value, 0),
          updated_at = now()
      WHERE user_id = target_user_id;
      
    WHEN 'total_teams_joined' THEN
      UPDATE public.user_statistics 
      SET total_teams_joined = GREATEST(total_teams_joined + increment_value, 0),
          updated_at = now()
      WHERE user_id = target_user_id;
      
    WHEN 'total_likes_received' THEN
      UPDATE public.user_statistics 
      SET total_likes_received = GREATEST(total_likes_received + increment_value, 0),
          updated_at = now()
      WHERE user_id = target_user_id;
      
    WHEN 'total_comments_received' THEN
      UPDATE public.user_statistics 
      SET total_comments_received = GREATEST(total_comments_received + increment_value, 0),
          updated_at = now()
      WHERE user_id = target_user_id;
      
    WHEN 'total_events_attended' THEN
      UPDATE public.user_statistics 
      SET total_events_attended = GREATEST(total_events_attended + increment_value, 0),
          updated_at = now()
      WHERE user_id = target_user_id;
      
    WHEN 'total_xp' THEN
      UPDATE public.user_statistics 
      SET total_xp = GREATEST(total_xp + increment_value, 0),
          updated_at = now()
      WHERE user_id = target_user_id;
      
    WHEN 'total_badges_earned' THEN
      UPDATE public.user_statistics 
      SET total_badges_earned = GREATEST(total_badges_earned + increment_value, 0),
          updated_at = now()
      WHERE user_id = target_user_id;
      
    ELSE
      RAISE EXCEPTION 'Unknown field: %', field_name;
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- BATCH UPDATE FUNCTION
-- ============================================================================

-- Function to batch update multiple statistics fields
CREATE OR REPLACE FUNCTION batch_update_statistics(
  target_user_id UUID,
  updates JSONB
)
RETURNS VOID AS $$
DECLARE
  update_data JSONB;
BEGIN
  -- Ensure user statistics record exists
  INSERT INTO public.user_statistics (user_id)
  VALUES (target_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  -- Build update data from JSONB
  update_data := jsonb_build_object('updated_at', now());

  -- Process each field in the updates
  IF updates ? 'total_posts' THEN
    update_data := update_data || jsonb_build_object('total_posts', updates->>'total_posts');
  END IF;
  
  IF updates ? 'total_events_created' THEN
    update_data := update_data || jsonb_build_object('total_events_created', updates->>'total_events_created');
  END IF;
  
  IF updates ? 'total_projects' THEN
    update_data := update_data || jsonb_build_object('total_projects', updates->>'total_projects');
  END IF;
  
  IF updates ? 'total_teams_created' THEN
    update_data := update_data || jsonb_build_object('total_teams_created', updates->>'total_teams_created');
  END IF;
  
  IF updates ? 'total_teams_joined' THEN
    update_data := update_data || jsonb_build_object('total_teams_joined', updates->>'total_teams_joined');
  END IF;
  
  IF updates ? 'total_likes_received' THEN
    update_data := update_data || jsonb_build_object('total_likes_received', updates->>'total_likes_received');
  END IF;
  
  IF updates ? 'total_comments_received' THEN
    update_data := update_data || jsonb_build_object('total_comments_received', updates->>'total_comments_received');
  END IF;
  
  IF updates ? 'total_events_attended' THEN
    update_data := update_data || jsonb_build_object('total_events_attended', updates->>'total_events_attended');
  END IF;
  
  IF updates ? 'total_xp' THEN
    update_data := update_data || jsonb_build_object('total_xp', updates->>'total_xp');
  END IF;
  
  IF updates ? 'current_streak' THEN
    update_data := update_data || jsonb_build_object('current_streak', updates->>'current_streak');
  END IF;
  
  IF updates ? 'longest_streak' THEN
    update_data := update_data || jsonb_build_object('longest_streak', updates->>'longest_streak');
  END IF;
  
  IF updates ? 'total_badges_earned' THEN
    update_data := update_data || jsonb_build_object('total_badges_earned', updates->>'total_badges_earned');
  END IF;
  
  IF updates ? 'last_post_at' THEN
    update_data := update_data || jsonb_build_object('last_post_at', (updates->>'last_post_at')::timestamp);
  END IF;
  
  IF updates ? 'last_event_created_at' THEN
    update_data := update_data || jsonb_build_object('last_event_created_at', (updates->>'last_event_created_at')::timestamp);
  END IF;
  
  IF updates ? 'last_project_created_at' THEN
    update_data := update_data || jsonb_build_object('last_project_created_at', (updates->>'last_project_created_at')::timestamp);
  END IF;
  
  IF updates ? 'last_activity_at' THEN
    update_data := update_data || jsonb_build_object('last_activity_at', (updates->>'last_activity_at')::timestamp);
  END IF;

  -- Perform the update
  UPDATE public.user_statistics 
  SET 
    total_posts = COALESCE((update_data->>'total_posts')::integer, total_posts),
    total_events_created = COALESCE((update_data->>'total_events_created')::integer, total_events_created),
    total_projects = COALESCE((update_data->>'total_projects')::integer, total_projects),
    total_teams_created = COALESCE((update_data->>'total_teams_created')::integer, total_teams_created),
    total_teams_joined = COALESCE((update_data->>'total_teams_joined')::integer, total_teams_joined),
    total_likes_received = COALESCE((update_data->>'total_likes_received')::integer, total_likes_received),
    total_comments_received = COALESCE((update_data->>'total_comments_received')::integer, total_comments_received),
    total_events_attended = COALESCE((update_data->>'total_events_attended')::integer, total_events_attended),
    total_xp = COALESCE((update_data->>'total_xp')::integer, total_xp),
    current_streak = COALESCE((update_data->>'current_streak')::integer, current_streak),
    longest_streak = GREATEST(longest_streak, COALESCE((update_data->>'longest_streak')::integer, longest_streak)),
    total_badges_earned = COALESCE((update_data->>'total_badges_earned')::integer, total_badges_earned),
    last_post_at = COALESCE((update_data->>'last_post_at')::timestamp, last_post_at),
    last_event_created_at = COALESCE((update_data->>'last_event_created_at')::timestamp, last_event_created_at),
    last_project_created_at = COALESCE((update_data->>'last_project_created_at')::timestamp, last_project_created_at),
    last_activity_at = COALESCE((update_data->>'last_activity_at')::timestamp, last_activity_at),
    updated_at = now()
  WHERE user_id = target_user_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STATISTICS REFRESH FUNCTIONS
-- ============================================================================

-- Function to refresh all statistics for a user
CREATE OR REPLACE FUNCTION refresh_user_statistics(target_user_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Ensure user statistics record exists
  INSERT INTO public.user_statistics (user_id)
  VALUES (target_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  -- Refresh all statistics
  UPDATE public.user_statistics 
  SET 
    total_posts = (
      SELECT COUNT(*) FROM public.posts WHERE author_id = target_user_id
    ),
    total_events_created = (
      SELECT COUNT(*) FROM public.events WHERE creator_id = target_user_id
    ),
    total_projects = (
      SELECT COUNT(*) FROM public.projects WHERE created_by = target_user_id
    ),
    total_teams_created = (
      SELECT COUNT(*) FROM public.teams WHERE created_by = target_user_id
    ),
    total_teams_joined = (
      SELECT COUNT(*) FROM public.team_members WHERE user_id = target_user_id
    ),
    total_events_attended = (
      SELECT COUNT(*) FROM public.bookings WHERE attendee_id = target_user_id
    ),
    total_xp = (
      SELECT COALESCE(SUM(xp_earned), 0) FROM public.xp_transactions WHERE user_id = target_user_id
    ),
    total_badges_earned = (
      SELECT COUNT(*) FROM public.user_badges WHERE user_id = target_user_id
    ),
    updated_at = now()
  WHERE user_id = target_user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to refresh all user statistics
CREATE OR REPLACE FUNCTION refresh_all_user_statistics()
RETURNS VOID AS $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN SELECT id FROM public.users LOOP
    PERFORM refresh_user_statistics(user_record.id);
  END LOOP;
END;
$$ LANGUAGE plpgsql;
