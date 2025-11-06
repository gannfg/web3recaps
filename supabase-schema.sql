-- Auto-generated schema based on db.txt
-- Generated at 2025-11-04T05:14:17.594Z

BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$ BEGIN
  CREATE TYPE public.badge_rarity AS ENUM ('common','uncommon','rare','epic','legendary');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.user_role AS ENUM ('VISITOR','STUDENT','BUILDER','AUTHOR','ADMIN');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE public.achievements (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  icon text,
  rarity public.badge_rarity DEFAULT 'common'::badge_rarity,
  xp_reward integer DEFAULT 0,
  requirements jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT achievements_pkey PRIMARY KEY (id)
);

CREATE TABLE public.admin_actions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  admin_wallet text NOT NULL,
  action_type text NOT NULL,
  target_type text,
  target_id text,
  details jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT admin_actions_pkey PRIMARY KEY (id)
);

CREATE TABLE public.bookings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  event_id uuid,
  attendee_id uuid,
  status text DEFAULT 'confirmed'::text CHECK (status = ANY (ARRAY['confirmed'::text, 'waitlisted'::text, 'cancelled'::text, 'no_show'::text, 'attended'::text])),
  booked_at timestamp with time zone DEFAULT now(),
  checked_in boolean DEFAULT false,
  checked_in_at timestamp with time zone,
  xp_awarded boolean DEFAULT false,
  waitlist_position integer,
  CONSTRAINT bookings_pkey PRIMARY KEY (id)
);

CREATE TABLE public.checkins (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  qr_code text NOT NULL,
  checked_in_at timestamp with time zone DEFAULT now(),
  date date DEFAULT CURRENT_DATE,
  signature text,
  location text,
  verified boolean DEFAULT true,
  CONSTRAINT checkins_pkey PRIMARY KEY (id)
);

CREATE TABLE public.comment_likes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  comment_id uuid,
  user_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  post_short_id bigint,
  CONSTRAINT comment_likes_pkey PRIMARY KEY (id)
);

CREATE TABLE public.comments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  post_id uuid,
  author_id uuid,
  parent_comment_id uuid,
  content text NOT NULL,
  likes_count integer DEFAULT 0,
  replies_count integer DEFAULT 0,
  is_edited boolean DEFAULT false,
  edited_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  post_short_id bigint NOT NULL,
  CONSTRAINT comments_pkey PRIMARY KEY (id)
);

CREATE TABLE public.content_flags (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  content_type text NOT NULL,
  content_id uuid NOT NULL,
  author_wallet text,
  flag_reason text NOT NULL,
  flag_details text,
  risk_score integer DEFAULT 0,
  status text DEFAULT 'pending'::text,
  flagged_by text,
  flagged_at timestamp with time zone DEFAULT now(),
  reviewed_by text,
  reviewed_at timestamp with time zone,
  resolution text,
  CONSTRAINT content_flags_pkey PRIMARY KEY (id)
);

CREATE TABLE public.email_verification_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  token text NOT NULL UNIQUE,
  expires_at timestamp with time zone NOT NULL,
  used_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT email_verification_tokens_pkey PRIMARY KEY (id)
);

CREATE TABLE public.event_attendance (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'registered'::text CHECK (status = ANY (ARRAY['registered'::text, 'attended'::text, 'no_show'::text, 'cancelled'::text])),
  registered_at timestamp with time zone DEFAULT now(),
  attended_at timestamp with time zone,
  check_in_code text,
  notes text,
  feedback_rating integer CHECK (feedback_rating >= 1 AND feedback_rating <= 5),
  feedback_comment text,
  xp_earned integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT event_attendance_pkey PRIMARY KEY (id)
);

CREATE TABLE public.event_attendees (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  event_id uuid,
  user_id uuid,
  status text NOT NULL CHECK (status = ANY (ARRAY['confirmed'::text, 'waitlisted'::text, 'cancelled'::text, 'no_show'::text, 'attended'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT event_attendees_pkey PRIMARY KEY (id)
);

CREATE TABLE public.event_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  color text DEFAULT '#3B82F6'::text,
  icon text,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT event_categories_pkey PRIMARY KEY (id)
);

CREATE TABLE public.event_feedback (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  event_id uuid,
  user_id uuid,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  helpful boolean NOT NULL DEFAULT false,
  would_recommend boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT event_feedback_pkey PRIMARY KEY (id)
);

CREATE TABLE public.event_filters (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  filter_name text NOT NULL,
  filter_criteria jsonb NOT NULL,
  skill_levels text[] DEFAULT ARRAY['beginner'::text, 'intermediate'::text, 'advanced'::text, 'all'::text],
  max_cost numeric,
  date_range jsonb,
  tags text[],
  is_default boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT event_filters_pkey PRIMARY KEY (id)
);

CREATE TABLE public.event_organizers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  organizer_type text NOT NULL CHECK (organizer_type = ANY (ARRAY['user'::text, 'team'::text])),
  organizer_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'co_organizer'::text CHECK (role = ANY (ARRAY['primary'::text, 'secondary'::text, 'co_organizer'::text])),
  added_at timestamp with time zone DEFAULT now(),
  added_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT event_organizers_pkey PRIMARY KEY (id)
);

CREATE TABLE public.event_reminders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  hours_before integer NOT NULL CHECK (hours_before = ANY (ARRAY[24, 6])),
  scheduled_for timestamp with time zone NOT NULL,
  status character varying NOT NULL DEFAULT 'pending'::character varying CHECK (status::text = ANY (ARRAY['pending'::character varying, 'sent'::character varying, 'cancelled'::character varying, 'failed'::character varying]::text[])),
  created_at timestamp with time zone DEFAULT now(),
  sent_at timestamp with time zone,
  CONSTRAINT event_reminders_pkey PRIMARY KEY (id)
);

CREATE TABLE public.events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  creator_id uuid,
  event_date date NOT NULL,
  start_time time without time zone NOT NULL,
  end_time time without time zone NOT NULL,
  event_type text NOT NULL CHECK (event_type = ANY (ARRAY['marketing'::text, 'social'::text, 'workshop'::text, '1on1'::text, 'study_group'::text, 'hackathon'::text, 'meetup'::text, 'conference'::text, 'networking'::text])),
  location text NOT NULL,
  max_attendees integer NOT NULL DEFAULT 1,
  current_attendees_count integer DEFAULT 0,
  waitlist_count integer DEFAULT 0,
  is_public boolean DEFAULT true,
  is_recurring boolean DEFAULT false,
  tags text[],
  requirements text[],
  materials text[],
  xp_reward integer DEFAULT 0,
  status text DEFAULT 'published'::text CHECK (status = ANY (ARRAY['draft'::text, 'published'::text, 'ongoing'::text, 'completed'::text, 'cancelled'::text])),
  check_in_code text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  recurring_pattern_id uuid,
  event_source text DEFAULT 'user'::text CHECK (event_source = ANY (ARRAY['sponsor'::text, 'workshop'::text, 'user'::text, 'official'::text])),
  sponsor_id uuid,
  workshop_leader_id uuid,
  is_featured boolean DEFAULT false,
  priority integer DEFAULT 0,
  external_url text,
  registration_url text,
  cost numeric DEFAULT 0,
  currency text DEFAULT 'USD'::text,
  capacity_type text DEFAULT 'limited'::text CHECK (capacity_type = ANY (ARRAY['unlimited'::text, 'limited'::text, 'invite_only'::text])),
  age_restriction text,
  skill_level text CHECK (skill_level = ANY (ARRAY['beginner'::text, 'intermediate'::text, 'advanced'::text, 'all'::text])),
  prerequisites text[],
  learning_objectives text[],
  materials_provided text[],
  contact_email text,
  contact_phone text,
  social_links jsonb DEFAULT '{}'::jsonb,
  media_urls text[],
  approval_status text DEFAULT 'approved'::text CHECK (approval_status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'needs_review'::text])),
  approved_by uuid,
  approved_at timestamp with time zone,
  rejection_reason text,
  location_type text DEFAULT 'physical'::text CHECK (location_type = ANY (ARRAY['online'::text, 'physical'::text, 'hybrid'::text])),
  short_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  banner_image text,
  logo_image text,
  cover_image text,
  layout_position character varying,
  CONSTRAINT events_pkey PRIMARY KEY (id)
);

CREATE TABLE public.magazine_pages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  magazine_id uuid,
  page_number integer NOT NULL,
  page_title text,
  image_url text NOT NULL,
  page_type text DEFAULT 'content'::text CHECK (page_type = ANY (ARRAY['cover'::text, 'content'::text, 'back_cover'::text])),
  sort_order integer NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT magazine_pages_pkey PRIMARY KEY (id)
);

CREATE TABLE public.magazines (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  issue_number integer NOT NULL,
  issue_date date NOT NULL,
  status text DEFAULT 'draft'::text CHECK (status = ANY (ARRAY['draft'::text, 'published'::text, 'archived'::text])),
  cover_image_url text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid,
  CONSTRAINT magazines_pkey PRIMARY KEY (id)
);

CREATE TABLE public.news_article_bookmarks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  article_id uuid,
  user_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT news_article_bookmarks_pkey PRIMARY KEY (id)
);

CREATE TABLE public.news_article_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  article_id uuid,
  user_id uuid,
  parent_id uuid,
  content text NOT NULL,
  is_approved boolean DEFAULT true,
  is_pinned boolean DEFAULT false,
  like_count integer DEFAULT 0,
  reply_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT news_article_comments_pkey PRIMARY KEY (id)
);

CREATE TABLE public.news_article_reactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  article_id uuid,
  user_id uuid,
  reaction_type character varying NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT news_article_reactions_pkey PRIMARY KEY (id)
);

CREATE TABLE public.news_article_shares (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  article_id uuid,
  user_id uuid,
  platform character varying NOT NULL,
  shared_at timestamp with time zone DEFAULT now(),
  ip_address inet,
  user_agent text,
  CONSTRAINT news_article_shares_pkey PRIMARY KEY (id)
);

CREATE TABLE public.news_article_views (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  article_id uuid,
  user_id uuid,
  session_id character varying,
  ip_address inet,
  user_agent text,
  referrer text,
  utm_source character varying,
  utm_medium character varying,
  utm_campaign character varying,
  time_on_page numeric,
  scroll_depth numeric,
  viewed_at timestamp with time zone DEFAULT now(),
  CONSTRAINT news_article_views_pkey PRIMARY KEY (id)
);

CREATE TABLE public.news_articles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title character varying NOT NULL,
  slug character varying NOT NULL UNIQUE,
  excerpt text,
  content text NOT NULL,
  featured_image_url text,
  featured_image_alt text,
  author_id uuid,
  author_name character varying NOT NULL,
  author_email character varying,
  author_bio text,
  author_avatar_url text,
  author_twitter character varying,
  author_linkedin character varying,
  subcategory character varying,
  tags text[] DEFAULT '{}'::text[],
  source_type character varying NOT NULL DEFAULT 'internal'::character varying,
  external_url text,
  external_source character varying,
  status character varying NOT NULL DEFAULT 'draft'::character varying,
  published_at timestamp with time zone,
  scheduled_at timestamp with time zone,
  updated_at timestamp with time zone DEFAULT now(),
  meta_title character varying,
  meta_description character varying,
  meta_keywords text[],
  canonical_url text,
  og_title character varying,
  og_description character varying,
  og_image_url text,
  twitter_title character varying,
  twitter_description character varying,
  twitter_image_url text,
  reading_time integer,
  word_count integer,
  view_count integer DEFAULT 0,
  unique_view_count integer DEFAULT 0,
  like_count integer DEFAULT 0,
  comment_count integer DEFAULT 0,
  share_count integer DEFAULT 0,
  bookmark_count integer DEFAULT 0,
  engagement_score numeric DEFAULT 0,
  time_on_page numeric DEFAULT 0,
  bounce_rate numeric DEFAULT 0,
  scroll_depth numeric DEFAULT 0,
  is_featured boolean DEFAULT false,
  is_breaking boolean DEFAULT false,
  is_trending boolean DEFAULT false,
  is_editor_pick boolean DEFAULT false,
  priority integer DEFAULT 0,
  editor_notes text,
  content_type character varying DEFAULT 'article'::character varying,
  language character varying DEFAULT 'en'::character varying,
  reading_level character varying DEFAULT 'intermediate'::character varying,
  allow_comments boolean DEFAULT true,
  allow_sharing boolean DEFAULT true,
  allow_bookmarking boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  category_id uuid NOT NULL,
  layout_position character varying,
  CONSTRAINT news_articles_pkey PRIMARY KEY (id)
);

CREATE TABLE public.news_author_follows (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  author_id uuid,
  follower_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT news_author_follows_pkey PRIMARY KEY (id)
);

CREATE TABLE public.news_breaking_alerts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  article_id uuid,
  title character varying NOT NULL,
  message text,
  is_sent boolean DEFAULT false,
  sent_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT news_breaking_alerts_pkey PRIMARY KEY (id)
);

CREATE TABLE public.news_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL UNIQUE,
  slug character varying NOT NULL UNIQUE,
  description text,
  color character varying DEFAULT '#3B82F6'::character varying,
  icon character varying,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  subscriber_count integer DEFAULT 0,
  article_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT news_categories_pkey PRIMARY KEY (id)
);

CREATE TABLE public.news_category_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  category character varying NOT NULL,
  subscription_type character varying DEFAULT 'all'::character varying,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT news_category_subscriptions_pkey PRIMARY KEY (id)
);

CREATE TABLE public.news_comment_reactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  comment_id uuid,
  user_id uuid,
  reaction_type character varying NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT news_comment_reactions_pkey PRIMARY KEY (id)
);

CREATE TABLE public.news_media (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  article_id uuid,
  media_type character varying NOT NULL,
  file_url text NOT NULL,
  file_name character varying NOT NULL,
  file_size integer,
  mime_type character varying,
  alt_text text,
  caption text,
  credit text,
  sort_order integer DEFAULT 0,
  is_featured boolean DEFAULT false,
  width integer,
  height integer,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT news_media_pkey PRIMARY KEY (id)
);

CREATE TABLE public.news_newsletter_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email character varying NOT NULL UNIQUE,
  name character varying,
  is_active boolean DEFAULT true,
  subscription_type character varying DEFAULT 'daily'::character varying,
  categories text[] DEFAULT '{}'::text[],
  preferences jsonb DEFAULT '{}'::jsonb,
  verification_token character varying,
  is_verified boolean DEFAULT false,
  subscribed_at timestamp with time zone DEFAULT now(),
  unsubscribed_at timestamp with time zone,
  last_sent_at timestamp with time zone,
  CONSTRAINT news_newsletter_subscriptions_pkey PRIMARY KEY (id)
);

CREATE TABLE public.news_trending_articles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  article_id uuid,
  score numeric NOT NULL,
  period character varying NOT NULL,
  calculated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT news_trending_articles_pkey PRIMARY KEY (id)
);

CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  data jsonb,
  read_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  read boolean DEFAULT false,
  action_url text,
  actor_id uuid,
  entity_type character varying,
  entity_id uuid,
  CONSTRAINT notifications_pkey PRIMARY KEY (id)
);

CREATE TABLE public.password_reset_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  token text NOT NULL UNIQUE,
  expires_at timestamp with time zone NOT NULL,
  used_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id)
);

CREATE TABLE public.post_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL,
  post_short_id bigint NOT NULL,
  author_id uuid NOT NULL,
  content text NOT NULL CHECK (length(content) > 0 AND length(content) <= 280),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT post_comments_pkey PRIMARY KEY (id)
);

CREATE TABLE public.post_likes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  post_id uuid,
  user_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  post_short_id bigint NOT NULL,
  CONSTRAINT post_likes_pkey PRIMARY KEY (id)
);

CREATE TABLE public.posts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text,
  content text NOT NULL,
  author_id uuid,
  collaborators text[],
  tags text[],
  media_url text,
  github_url text,
  figma_url text,
  website_url text,
  post_type text DEFAULT 'general'::text CHECK (post_type = ANY (ARRAY['project'::text, 'help'::text, 'showcase'::text, 'team'::text, 'general'::text])),
  skills_needed text[],
  team_size integer,
  deadline date,
  likes_count integer DEFAULT 0,
  comments_count integer DEFAULT 0,
  liked_by text[],
  is_collaboration boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  short_id bigint NOT NULL UNIQUE,
  images jsonb DEFAULT '[]'::jsonb,
  videos text[] DEFAULT '{}'::text[],
  CONSTRAINT posts_pkey PRIMARY KEY (id)
);

CREATE TABLE public.project_bookmarks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT project_bookmarks_pkey PRIMARY KEY (id)
);

CREATE TABLE public.project_contributors (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'contributor'::text CHECK (role = ANY (ARRAY['lead'::text, 'developer'::text, 'designer'::text, 'pm'::text, 'marketing'::text, 'contributor'::text])),
  contribution_description text,
  hours_contributed integer DEFAULT 0,
  is_active boolean DEFAULT true,
  joined_at timestamp with time zone DEFAULT now(),
  CONSTRAINT project_contributors_pkey PRIMARY KEY (id)
);

CREATE TABLE public.project_likes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT project_likes_pkey PRIMARY KEY (id)
);

CREATE TABLE public.project_updates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  update_type text DEFAULT 'general'::text CHECK (update_type = ANY (ARRAY['general'::text, 'feature'::text, 'bugfix'::text, 'release'::text, 'milestone'::text])),
  version text,
  images text[] DEFAULT '{}'::text[],
  created_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT project_updates_pkey PRIMARY KEY (id)
);

CREATE TABLE public.project_views (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  user_id uuid,
  ip_address inet,
  user_agent text,
  viewed_at timestamp with time zone DEFAULT now(),
  CONSTRAINT project_views_pkey PRIMARY KEY (id)
);

CREATE TABLE public.projects (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  tagline text,
  description text,
  long_description text,
  team_id uuid,
  created_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'planning'::text CHECK (status = ANY (ARRAY['planning'::text, 'in_progress'::text, 'completed'::text, 'published'::text, 'archived'::text])),
  progress integer DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  project_type text CHECK (project_type = ANY (ARRAY['web_app'::text, 'mobile_app'::text, 'game'::text, 'defi'::text, 'nft'::text, 'dao'::text, 'tool'::text, 'library'::text, 'other'::text])),
  category text[],
  tags text[],
  banner_image text,
  logo_image text,
  screenshots text[] DEFAULT '{}'::text[],
  videos text[] DEFAULT '{}'::text[],
  demo_images text[] DEFAULT '{}'::text[],
  github_url text,
  demo_url text,
  website_url text,
  docs_url text,
  figma_url text,
  discord_url text,
  twitter_url text,
  tech_stack text[],
  blockchain text[],
  smart_contracts jsonb DEFAULT '{}'::jsonb,
  github_stars integer DEFAULT 0,
  github_forks integer DEFAULT 0,
  website_visits integer DEFAULT 0,
  demo_interactions integer DEFAULT 0,
  start_date date,
  end_date date,
  launch_date date,
  last_updated_at timestamp with time zone DEFAULT now(),
  is_public boolean DEFAULT true,
  is_featured boolean DEFAULT false,
  featured_priority integer DEFAULT 0,
  views_count integer DEFAULT 0,
  likes_count integer DEFAULT 0,
  bookmarks_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT projects_pkey PRIMARY KEY (id)
);

CREATE TABLE public.qr_code_usage (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  qr_code_id uuid,
  user_id uuid,
  used_at timestamp with time zone DEFAULT now(),
  CONSTRAINT qr_code_usage_pkey PRIMARY KEY (id)
);

CREATE TABLE public.qr_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  date date NOT NULL,
  is_daily boolean DEFAULT false,
  used_count integer DEFAULT 0,
  max_uses integer DEFAULT 1,
  expires_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT qr_codes_pkey PRIMARY KEY (id)
);

CREATE TABLE public.recurring_patterns (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  event_id uuid,
  frequency text NOT NULL CHECK (frequency = ANY (ARRAY['daily'::text, 'weekly'::text, 'monthly'::text])),
  interval_count integer DEFAULT 1,
  end_date date,
  days_of_week text[],
  max_occurrences integer,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT recurring_patterns_pkey PRIMARY KEY (id)
);

CREATE TABLE public.schema_migrations (
  version text NOT NULL,
  applied_at timestamp with time zone DEFAULT now(),
  CONSTRAINT schema_migrations_pkey PRIMARY KEY (version)
);

CREATE TABLE public.secure_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_wallet text NOT NULL,
  session_token text NOT NULL UNIQUE,
  ip_address inet,
  user_agent text,
  expires_at timestamp with time zone NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT secure_sessions_pkey PRIMARY KEY (id)
);

CREATE TABLE public.security_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  severity text DEFAULT 'low'::text,
  user_wallet text,
  ip_address inet,
  user_agent text,
  details jsonb,
  resolved boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT security_events_pkey PRIMARY KEY (id)
);

CREATE TABLE public.system_metrics (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  metric_type text NOT NULL,
  metric_name text NOT NULL,
  metric_value numeric NOT NULL,
  dimensions jsonb,
  recorded_at timestamp with time zone DEFAULT now(),
  CONSTRAINT system_metrics_pkey PRIMARY KEY (id)
);

CREATE TABLE public.team_achievements (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL,
  achievement_type text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  xp_reward integer DEFAULT 0,
  icon text,
  rarity text DEFAULT 'common'::text CHECK (rarity = ANY (ARRAY['common'::text, 'uncommon'::text, 'rare'::text, 'epic'::text, 'legendary'::text])),
  earned_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT team_achievements_pkey PRIMARY KEY (id)
);

CREATE TABLE public.team_activity (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL,
  user_id uuid,
  activity_type text NOT NULL,
  activity_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT team_activity_pkey PRIMARY KEY (id)
);

CREATE TABLE public.team_invitations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL,
  inviter_id uuid NOT NULL,
  invitee_id uuid,
  invitee_email text,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'accepted'::text, 'declined'::text, 'expired'::text])),
  role text NOT NULL DEFAULT 'member'::text CHECK (role = ANY (ARRAY['leader'::text, 'co_leader'::text, 'developer'::text, 'designer'::text, 'pm'::text, 'marketing'::text, 'member'::text])),
  message text,
  expires_at timestamp with time zone DEFAULT (now() + '7 days'::interval),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT team_invitations_pkey PRIMARY KEY (id)
);

CREATE TABLE public.team_members (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role text DEFAULT 'member'::text CHECK (role = ANY (ARRAY['leader'::text, 'member'::text])),
  joined_at timestamp with time zone DEFAULT now(),
  permissions text[] DEFAULT ARRAY['view'::text],
  contribution_score integer DEFAULT 0,
  is_active boolean DEFAULT true,
  last_active_at timestamp with time zone DEFAULT now(),
  CONSTRAINT team_members_pkey PRIMARY KEY (id)
);

CREATE TABLE public.teams (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  avatar_url text,
  skills text[],
  looking_for text[],
  project_type text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  status text DEFAULT 'recruiting'::text CHECK (status = ANY (ARRAY['recruiting'::text, 'active'::text, 'completed'::text, 'archived'::text])),
  max_members integer DEFAULT 10,
  timeline text,
  location text DEFAULT 'remote'::text,
  github_url text,
  figma_url text,
  website_url text,
  discord_url text,
  total_xp integer DEFAULT 0,
  team_level integer DEFAULT 1,
  founded_date date DEFAULT CURRENT_DATE,
  budget_range text,
  equity_split jsonb DEFAULT '{}'::jsonb,
  meeting_schedule text,
  skills_required text[],
  tags text[],
  CONSTRAINT teams_pkey PRIMARY KEY (id)
);

CREATE TABLE public.user_achievements (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  achievement_id uuid NOT NULL,
  earned_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_achievements_pkey PRIMARY KEY (id)
);

CREATE TABLE public.user_action_limits (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  action_type character varying NOT NULL,
  action_count integer DEFAULT 0,
  date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_action_limits_pkey PRIMARY KEY (id)
);

CREATE TABLE public.user_badges (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  badge_id text NOT NULL,
  badge_name text NOT NULL,
  badge_description text NOT NULL,
  badge_icon text NOT NULL,
  badge_rarity public.badge_rarity NOT NULL,
  unlocked_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_badges_pkey PRIMARY KEY (id)
);

CREATE TABLE public.user_profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  bio text,
  location text,
  website text,
  twitter_handle text,
  linkedin_url text,
  github_username text,
  discord_handle text,
  timezone text DEFAULT 'UTC'::text,
  notification_preferences jsonb DEFAULT '{"newsletter": true, "push_notifications": true, "email_notifications": true, "event_notifications": true, "follow_notifications": true, "mention_notifications": true, "achievement_notifications": true}'::jsonb,
  privacy_settings jsonb DEFAULT '{"show_email": false, "show_wallet": true, "show_activity": true, "profile_visibility": "public"}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_profiles_pkey PRIMARY KEY (id)
);

CREATE TABLE public.user_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE,
  role text NOT NULL CHECK (role = ANY (ARRAY['Visitor'::text, 'Student'::text, 'Builder'::text, 'Admin'::text])),
  assigned_at timestamp with time zone DEFAULT now(),
  assigned_by uuid,
  CONSTRAINT user_roles_pkey PRIMARY KEY (id)
);

CREATE TABLE public.user_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  session_token text NOT NULL UNIQUE,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_sessions_pkey PRIMARY KEY (id)
);

CREATE TABLE public.user_skills (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  skill_name text NOT NULL,
  proficiency_level integer DEFAULT 1 CHECK (proficiency_level >= 1 AND proficiency_level <= 5),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_skills_pkey PRIMARY KEY (id)
);

CREATE TABLE public.user_statistics (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  total_posts integer DEFAULT 0,
  total_events_created integer DEFAULT 0,
  total_projects integer DEFAULT 0,
  total_teams_created integer DEFAULT 0,
  total_teams_joined integer DEFAULT 0,
  total_likes_received integer DEFAULT 0,
  total_comments_received integer DEFAULT 0,
  total_events_attended integer DEFAULT 0,
  total_xp integer DEFAULT 0,
  current_streak integer DEFAULT 0,
  longest_streak integer DEFAULT 0,
  total_badges_earned integer DEFAULT 0,
  last_post_at timestamp with time zone,
  last_event_created_at timestamp with time zone,
  last_project_created_at timestamp with time zone,
  last_activity_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_statistics_pkey PRIMARY KEY (id)
);

CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  wallet_address text UNIQUE,
  display_name text,
  bio text,
  avatar_url text,
  skills text[],
  role public.user_role DEFAULT 'VISITOR'::user_role,
  total_xp integer DEFAULT 0,
  level integer DEFAULT 1,
  rank text DEFAULT 'Newcomer'::text,
  onboarding_completed boolean DEFAULT false,
  learning_goals text,
  learning_goals_list text[],
  motivation text,
  blockchain_experience text[],
  solana_experience text,
  chains text[],
  social_links jsonb,
  project_name text,
  project_description text,
  project_github text,
  team_members text[],
  goals text,
  builder_bio text,
  builder_links jsonb,
  builder_avatar_url text,
  badges text[],
  join_date timestamp with time zone DEFAULT now(),
  is_suspended boolean DEFAULT false,
  suspension_reason text,
  suspended_until timestamp with time zone,
  last_seen timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  kyc_completed boolean DEFAULT false,
  kyc_document_url text,
  kyc_document_type text CHECK (kyc_document_type = ANY (ARRAY['passport'::text, 'drivers_license'::text, 'national_id'::text, 'ktp'::text])),
  kyc_full_name text,
  kyc_verified boolean DEFAULT false,
  kyc_verified_at timestamp with time zone,
  kyc_verified_by text,
  kyc_submitted_at timestamp with time zone,
  initial_onboarding_completed boolean DEFAULT false,
  kyc_status text DEFAULT 'pending'::text CHECK (kyc_status = ANY (ARRAY['pending'::text, 'verified'::text, 'rejected'::text])),
  verification_level integer DEFAULT 0 CHECK (verification_level >= 0 AND verification_level <= 3),
  email text UNIQUE,
  email_verified boolean DEFAULT false,
  password_hash text,
  auth_provider text DEFAULT 'email'::text CHECK (auth_provider = ANY (ARRAY['email'::text, 'wallet'::text, 'both'::text])),
  newsletter_subscribed boolean DEFAULT true,
  last_email_sent timestamp with time zone,
  banner_url text,
  CONSTRAINT users_pkey PRIMARY KEY (id)
);

CREATE TABLE public.wallet_links (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  wallet_address text NOT NULL UNIQUE,
  wallet_type text DEFAULT 'solana'::text CHECK (wallet_type = ANY (ARRAY['solana'::text, 'ethereum'::text, 'bitcoin'::text])),
  is_primary boolean DEFAULT false,
  linked_at timestamp with time zone DEFAULT now(),
  verified_at timestamp with time zone,
  CONSTRAINT wallet_links_pkey PRIMARY KEY (id)
);

CREATE TABLE public.xp_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  activity text NOT NULL,
  xp_earned integer NOT NULL,
  timestamp timestamp with time zone DEFAULT now(),
  details jsonb,
  CONSTRAINT xp_transactions_pkey PRIMARY KEY (id)
);

-- Deferred foreign key constraints
ALTER TABLE public.bookings ADD CONSTRAINT bookings_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id);
ALTER TABLE public.bookings ADD CONSTRAINT bookings_attendee_id_fkey FOREIGN KEY (attendee_id) REFERENCES public.users(id);
ALTER TABLE public.checkins ADD CONSTRAINT checkins_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);
ALTER TABLE public.comment_likes ADD CONSTRAINT comment_likes_comment_id_fkey FOREIGN KEY (comment_id) REFERENCES public.comments(id);
ALTER TABLE public.comment_likes ADD CONSTRAINT comment_likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);
ALTER TABLE public.comments ADD CONSTRAINT comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id);
ALTER TABLE public.comments ADD CONSTRAINT comments_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(id);
ALTER TABLE public.comments ADD CONSTRAINT comments_parent_comment_id_fkey FOREIGN KEY (parent_comment_id) REFERENCES public.comments(id);
ALTER TABLE public.comments ADD CONSTRAINT comments_post_short_id_fkey FOREIGN KEY (post_short_id) REFERENCES public.posts(short_id);
ALTER TABLE public.email_verification_tokens ADD CONSTRAINT email_verification_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);
ALTER TABLE public.event_attendance ADD CONSTRAINT event_attendance_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id);
ALTER TABLE public.event_attendance ADD CONSTRAINT event_attendance_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);
ALTER TABLE public.event_attendees ADD CONSTRAINT event_attendees_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id);
ALTER TABLE public.event_attendees ADD CONSTRAINT event_attendees_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);
ALTER TABLE public.event_feedback ADD CONSTRAINT event_feedback_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id);
ALTER TABLE public.event_feedback ADD CONSTRAINT event_feedback_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);
ALTER TABLE public.event_filters ADD CONSTRAINT event_filters_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);
ALTER TABLE public.event_organizers ADD CONSTRAINT event_organizers_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id);
ALTER TABLE public.event_organizers ADD CONSTRAINT event_organizers_added_by_fkey FOREIGN KEY (added_by) REFERENCES public.users(id);
ALTER TABLE public.event_reminders ADD CONSTRAINT event_reminders_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id);
ALTER TABLE public.events ADD CONSTRAINT events_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.users(id);
ALTER TABLE public.events ADD CONSTRAINT events_sponsor_id_fkey FOREIGN KEY (sponsor_id) REFERENCES public.users(id);
ALTER TABLE public.events ADD CONSTRAINT events_workshop_leader_id_fkey FOREIGN KEY (workshop_leader_id) REFERENCES public.users(id);
ALTER TABLE public.events ADD CONSTRAINT events_recurring_pattern_id_fkey FOREIGN KEY (recurring_pattern_id) REFERENCES public.recurring_patterns(id);
ALTER TABLE public.events ADD CONSTRAINT events_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);
ALTER TABLE public.magazine_pages ADD CONSTRAINT magazine_pages_magazine_id_fkey FOREIGN KEY (magazine_id) REFERENCES public.magazines(id);
ALTER TABLE public.magazines ADD CONSTRAINT magazines_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);
ALTER TABLE public.news_article_bookmarks ADD CONSTRAINT news_article_bookmarks_article_id_fkey FOREIGN KEY (article_id) REFERENCES public.news_articles(id);
ALTER TABLE public.news_article_bookmarks ADD CONSTRAINT news_article_bookmarks_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);
ALTER TABLE public.news_article_comments ADD CONSTRAINT news_article_comments_article_id_fkey FOREIGN KEY (article_id) REFERENCES public.news_articles(id);
ALTER TABLE public.news_article_comments ADD CONSTRAINT news_article_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);
ALTER TABLE public.news_article_comments ADD CONSTRAINT news_article_comments_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.news_article_comments(id);
ALTER TABLE public.news_article_reactions ADD CONSTRAINT news_article_reactions_article_id_fkey FOREIGN KEY (article_id) REFERENCES public.news_articles(id);
ALTER TABLE public.news_article_reactions ADD CONSTRAINT news_article_reactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);
ALTER TABLE public.news_article_shares ADD CONSTRAINT news_article_shares_article_id_fkey FOREIGN KEY (article_id) REFERENCES public.news_articles(id);
ALTER TABLE public.news_article_shares ADD CONSTRAINT news_article_shares_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);
ALTER TABLE public.news_article_views ADD CONSTRAINT news_article_views_article_id_fkey FOREIGN KEY (article_id) REFERENCES public.news_articles(id);
ALTER TABLE public.news_article_views ADD CONSTRAINT news_article_views_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);
ALTER TABLE public.news_articles ADD CONSTRAINT news_articles_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(id);
ALTER TABLE public.news_articles ADD CONSTRAINT news_articles_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.news_categories(id);
ALTER TABLE public.news_author_follows ADD CONSTRAINT news_author_follows_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(id);
ALTER TABLE public.news_author_follows ADD CONSTRAINT news_author_follows_follower_id_fkey FOREIGN KEY (follower_id) REFERENCES public.users(id);
ALTER TABLE public.news_breaking_alerts ADD CONSTRAINT news_breaking_alerts_article_id_fkey FOREIGN KEY (article_id) REFERENCES public.news_articles(id);
ALTER TABLE public.news_category_subscriptions ADD CONSTRAINT news_category_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);
ALTER TABLE public.news_comment_reactions ADD CONSTRAINT news_comment_reactions_comment_id_fkey FOREIGN KEY (comment_id) REFERENCES public.news_article_comments(id);
ALTER TABLE public.news_comment_reactions ADD CONSTRAINT news_comment_reactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);
ALTER TABLE public.news_media ADD CONSTRAINT news_media_article_id_fkey FOREIGN KEY (article_id) REFERENCES public.news_articles(id);
ALTER TABLE public.news_trending_articles ADD CONSTRAINT news_trending_articles_article_id_fkey FOREIGN KEY (article_id) REFERENCES public.news_articles(id);
ALTER TABLE public.notifications ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);
ALTER TABLE public.notifications ADD CONSTRAINT notifications_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.users(id);
ALTER TABLE public.password_reset_tokens ADD CONSTRAINT password_reset_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);
ALTER TABLE public.post_comments ADD CONSTRAINT post_comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id);
ALTER TABLE public.post_comments ADD CONSTRAINT post_comments_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(id);
ALTER TABLE public.post_comments ADD CONSTRAINT fk_post_comments_post_short_id FOREIGN KEY (post_short_id) REFERENCES public.posts(short_id);
ALTER TABLE public.post_comments ADD CONSTRAINT fk_post_comments_author_id FOREIGN KEY (author_id) REFERENCES public.users(id);
ALTER TABLE public.post_likes ADD CONSTRAINT post_likes_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id);
ALTER TABLE public.post_likes ADD CONSTRAINT post_likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);
ALTER TABLE public.post_likes ADD CONSTRAINT post_likes_post_short_id_fkey FOREIGN KEY (post_short_id) REFERENCES public.posts(short_id);
ALTER TABLE public.posts ADD CONSTRAINT posts_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(id);
ALTER TABLE public.project_bookmarks ADD CONSTRAINT project_bookmarks_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);
ALTER TABLE public.project_bookmarks ADD CONSTRAINT project_bookmarks_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);
ALTER TABLE public.project_contributors ADD CONSTRAINT project_contributors_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);
ALTER TABLE public.project_contributors ADD CONSTRAINT project_contributors_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);
ALTER TABLE public.project_likes ADD CONSTRAINT project_likes_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);
ALTER TABLE public.project_likes ADD CONSTRAINT project_likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);
ALTER TABLE public.project_updates ADD CONSTRAINT project_updates_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);
ALTER TABLE public.project_updates ADD CONSTRAINT project_updates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);
ALTER TABLE public.project_views ADD CONSTRAINT project_views_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);
ALTER TABLE public.project_views ADD CONSTRAINT project_views_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);
ALTER TABLE public.projects ADD CONSTRAINT projects_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id);
ALTER TABLE public.projects ADD CONSTRAINT projects_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);
ALTER TABLE public.qr_code_usage ADD CONSTRAINT qr_code_usage_qr_code_id_fkey FOREIGN KEY (qr_code_id) REFERENCES public.qr_codes(id);
ALTER TABLE public.qr_code_usage ADD CONSTRAINT qr_code_usage_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);
ALTER TABLE public.recurring_patterns ADD CONSTRAINT recurring_patterns_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id);
ALTER TABLE public.team_achievements ADD CONSTRAINT team_achievements_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id);
ALTER TABLE public.team_activity ADD CONSTRAINT team_activity_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id);
ALTER TABLE public.team_activity ADD CONSTRAINT team_activity_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);
ALTER TABLE public.team_invitations ADD CONSTRAINT team_invitations_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id);
ALTER TABLE public.team_invitations ADD CONSTRAINT team_invitations_inviter_id_fkey FOREIGN KEY (inviter_id) REFERENCES public.users(id);
ALTER TABLE public.team_invitations ADD CONSTRAINT team_invitations_invitee_id_fkey FOREIGN KEY (invitee_id) REFERENCES public.users(id);
ALTER TABLE public.team_members ADD CONSTRAINT team_members_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id);
ALTER TABLE public.team_members ADD CONSTRAINT team_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);
ALTER TABLE public.teams ADD CONSTRAINT teams_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);
ALTER TABLE public.user_achievements ADD CONSTRAINT user_achievements_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);
ALTER TABLE public.user_achievements ADD CONSTRAINT user_achievements_achievement_id_fkey FOREIGN KEY (achievement_id) REFERENCES public.achievements(id);
ALTER TABLE public.user_action_limits ADD CONSTRAINT user_action_limits_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);
ALTER TABLE public.user_badges ADD CONSTRAINT user_badges_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);
ALTER TABLE public.user_profiles ADD CONSTRAINT user_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.users(id);
ALTER TABLE public.user_sessions ADD CONSTRAINT user_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);
ALTER TABLE public.user_skills ADD CONSTRAINT user_skills_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);
ALTER TABLE public.user_statistics ADD CONSTRAINT user_statistics_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);
ALTER TABLE public.wallet_links ADD CONSTRAINT wallet_links_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);
ALTER TABLE public.xp_transactions ADD CONSTRAINT xp_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);

COMMIT;
