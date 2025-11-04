// News Platform Types
// Safe integration with existing social application

export interface NewsArticle {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  featured_image_url?: string;
  featured_image_alt?: string;
  author_id?: string;
  author_name: string;
  author_email?: string;
  author_bio?: string;
  author_avatar_url?: string;
  author_twitter?: string;
  author_linkedin?: string;
  category_id: string;
  subcategory?: string;
  tags: string[];
  source_type: 'internal' | 'external';
  external_url?: string;
  external_source?: string;
  status: 'draft' | 'published' | 'archived';
  published_at?: string;
  scheduled_at?: string;
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string[];
  canonical_url?: string;
  og_title?: string;
  og_description?: string;
  og_image_url?: string;
  twitter_title?: string;
  twitter_description?: string;
  twitter_image_url?: string;
  reading_time?: number;
  word_count?: number;
  view_count: number;
  unique_view_count: number;
  like_count: number;
  comment_count: number;
  share_count: number;
  bookmark_count: number;
  engagement_score: number;
  time_on_page?: number;
  bounce_rate?: number;
  scroll_depth?: number;
  is_featured: boolean;
  is_breaking: boolean;
  is_trending: boolean;
  is_editor_pick: boolean;
  layout_position?: string;
  priority: number;
  editor_notes?: string;
  content_type: 'article' | 'video' | 'podcast' | 'infographic';
  language: string;
  reading_level: 'beginner' | 'intermediate' | 'advanced';
  allow_comments: boolean;
  allow_sharing: boolean;
  allow_bookmarking: boolean;
  created_at: string;
  updated_at: string;
  
  // Relations
  author?: {
    id: string;
    name: string;
    avatar_url?: string;
    role: string;
  };
  category?: NewsCategory;
  reactions?: NewsArticleReaction[];
  comments?: NewsArticleComment[];
  bookmarks?: NewsArticleBookmark[];
}

export interface NewsCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  color: string;
  icon?: string;
  is_active: boolean;
  sort_order: number;
  subscriber_count: number;
  article_count: number;
  created_at: string;
}

export interface NewsArticleReaction {
  id: string;
  article_id: string;
  user_id: string;
  reaction_type: string;
  created_at: string;
}

export interface NewsArticleComment {
  id: string;
  article_id: string;
  user_id: string;
  parent_id?: string;
  content: string;
  is_approved: boolean;
  is_pinned: boolean;
  like_count: number;
  reply_count: number;
  created_at: string;
  updated_at: string;
  is_liked?: boolean; // Added for frontend state management
  
  // Relations
  author?: {
    id: string;
    display_name: string;
    avatar_url?: string;
  };
  replies?: NewsArticleComment[];
}

export interface NewsArticleBookmark {
  id: string;
  article_id: string;
  user_id: string;
  created_at: string;
}

// API Response Types
export interface NewsArticlesResponse {
  articles: NewsArticle[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export interface NewsArticleResponse {
  success: boolean;
  data: {
    article: NewsArticle;
    related_articles: NewsArticle[];
  };
}

// Form Types
export interface NewsArticleFormData {
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  featured_image_url?: string;
  featured_image_alt?: string;
  author_name: string;
  author_email?: string;
  author_bio?: string;
  author_avatar_url?: string;
  author_twitter?: string;
  author_linkedin?: string;
  category_id: string;
  subcategory?: string;
  tags: string[];
  source_type: 'internal' | 'external';
  external_url?: string;
  external_source?: string;
  status: 'draft' | 'published' | 'archived';
  is_breaking: boolean;
  is_featured: boolean;
  is_trending: boolean;
  is_editor_pick: boolean;
  priority: number;
  editor_notes?: string;
  content_type: 'article' | 'video' | 'podcast' | 'infographic';
  language: string;
  reading_level: 'beginner' | 'intermediate' | 'advanced';
  allow_comments: boolean;
  allow_sharing: boolean;
  allow_bookmarking: boolean;
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string[];
  canonical_url?: string;
  og_title?: string;
  og_description?: string;
  og_image_url?: string;
  twitter_title?: string;
  twitter_description?: string;
  twitter_image_url?: string;
}

export interface NewsCategoryFormData {
  name: string;
  description?: string;
  color: string;
  icon: string;
  is_active: boolean;
  sort_order: number;
}

// Filter and Search Types
export interface NewsFilters {
  category_id?: string;
  status?: 'all' | 'draft' | 'published' | 'archived';
  is_breaking?: boolean;
  is_featured?: boolean;
  author_id?: string;
  tags?: string[];
  date_from?: string;
  date_to?: string;
  search?: string;
  sort_by?: 'created_at' | 'published_at' | 'view_count' | 'like_count' | 'engagement_score';
  sort_order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// Analytics Types
export interface NewsAnalytics {
  total_articles: number;
  total_views: number;
  total_likes: number;
  total_comments: number;
  total_shares: number;
  avg_engagement_score: number;
  top_articles: NewsArticle[];
  top_categories: Array<{
    category: NewsCategory;
    article_count: number;
    view_count: number;
  }>;
  recent_activity: Array<{
    type: 'article_created' | 'article_published' | 'article_viewed' | 'article_liked' | 'comment_added';
    article_id: string;
    article_title: string;
    user_id?: string;
    user_name?: string;
    created_at: string;
  }>;
}

// Editor Types
export interface NewsEditor {
  can_create: boolean;
  can_edit: boolean;
  can_publish: boolean;
  can_delete: boolean;
  can_manage_categories: boolean;
  can_view_analytics: boolean;
}

// SEO Types
export interface NewsSEOMeta {
  title: string;
  description: string;
  keywords: string[];
  canonical_url: string;
  og_title?: string;
  og_description?: string;
  og_image?: string;
  og_type: 'article';
  twitter_card: 'summary_large_image';
  twitter_title?: string;
  twitter_description?: string;
  twitter_image?: string;
  article_published_time?: string;
  article_modified_time?: string;
  article_author?: string;
  article_section?: string;
  article_tag?: string[];
}

// Constants
export const NEWS_CATEGORIES = [
  { name: 'Breaking News', slug: 'breaking-news', color: '#ef4444', icon: 'zap' },
  { name: 'Technology', slug: 'technology', color: '#3b82f6', icon: 'cpu' },
  { name: 'Business', slug: 'business', color: '#10b981', icon: 'trending-up' },
  { name: 'Politics', slug: 'politics', color: '#8b5cf6', icon: 'landmark' },
  { name: 'World', slug: 'world', color: '#f59e0b', icon: 'globe' },
  { name: 'Sports', slug: 'sports', color: '#06b6d4', icon: 'trophy' },
  { name: 'Entertainment', slug: 'entertainment', color: '#ec4899', icon: 'music' },
  { name: 'Health', slug: 'health', color: '#84cc16', icon: 'heart' },
  { name: 'Science', slug: 'science', color: '#6366f1', icon: 'microscope' },
  { name: 'Opinion', slug: 'opinion', color: '#f97316', icon: 'message-square' },
] as const;

export const REACTION_TYPES = [
  'like', 'love', 'laugh', 'wow', 'sad', 'angry'
] as const;

export type ReactionType = typeof REACTION_TYPES[number];

export const ARTICLE_STATUS = [
  'draft', 'published', 'archived'
] as const;

export type ArticleStatus = typeof ARTICLE_STATUS[number];

// Event Types (for layout integration)
export interface Event {
  id: string;
  title: string;
  description?: string;
  event_date: string;
  start_time: string;
  end_time: string;
  location: string;
  event_type: 'marketing' | 'social' | 'workshop' | '1on1' | 'study_group' | 'hackathon' | 'meetup' | 'conference' | 'networking';
  max_attendees: number;
  current_attendees_count: number;
  is_public: boolean;
  is_featured: boolean;
  status: 'draft' | 'published' | 'ongoing' | 'completed' | 'cancelled';
  banner_image?: string;
  logo_image?: string;
  cover_image?: string;
  layout_position?: string;
  priority: number;
  cost: number;
  currency: string;
  skill_level?: 'beginner' | 'intermediate' | 'advanced' | 'all';
  location_type: 'online' | 'physical' | 'hybrid';
  external_url?: string;
  registration_url?: string;
  created_at: string;
  updated_at: string;
  
  // Relations
  creator?: {
    id: string;
    display_name: string;
    avatar_url?: string;
  };
  category?: EventCategory;
}

export interface EventCategory {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon?: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// Combined Layout Types
export interface LayoutItem {
  id: string;
  type: 'article' | 'event';
  title: string;
  excerpt?: string;
  featured_image_url?: string;
  published_at?: string;
  created_at: string;
  is_featured: boolean;
  is_breaking?: boolean;
  priority: number;
  layout_position?: string;
  
  // Article specific
  author_name?: string;
  category?: NewsCategory | EventCategory;
  reading_time?: number;
  view_count?: number;
  like_count?: number;
  comment_count?: number;
  
  // Event specific
  event_date?: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  event_type?: string;
  max_attendees?: number;
  current_attendees_count?: number;
  cost?: number;
  currency?: string;
  location_type?: string;
}
