// Core type definitions for ObeliskHub
export type UserRole = "Visitor" | "Student" | "Builder" | "Author" | "Admin" | "VISITOR" | "STUDENT" | "BUILDER" | "AUTHOR" | "ADMIN"

// KYC Types
export type KycStatus = 'pending' | 'verified' | 'rejected'
export type KycDocumentType = 'passport' | 'drivers_license' | 'national_id' | 'ktp'

export interface KycSubmission {
  id: string
  userId: string
  displayName: string
  email: string
  documentUrl: string
  documentType: KycDocumentType
  fullName: string
  status: KycStatus
  submittedAt: string
  verifiedAt?: string
  verifiedBy?: string
  rejectionReason?: string
  createdAt: string
}

export interface User {
  id: string // uuid
  email?: string // user's email address
  walletAddress?: string // unique when set
  displayName?: string
  avatarUrl?: string
  bannerUrl?: string
  bio?: string
  location?: string
  skills?: string[]
  role: UserRole // default Visitor
  totalXp: number // aggregate
  rank: string // "Newcomer", etc.
  level: number // 1..N
  onboardingCompleted: boolean
  learningGoals?: string
  learningGoalsList?: string[]
  motivation?: string
  blockchainExperience?: string[]
  solanaExperience?: string
  chains?: string[]
  projectName?: string
  projectDescription?: string
  projectGithub?: string
  teamMembers?: string[]
  goals?: string
  builderBio?: string
  builderLinks?: Record<string, any>
  badges?: any[]
  checkinStreak?: number
  newsletterSubscribed?: boolean
  socialLinks?: {
    github?: string
    twitter?: string
    linkedin?: string
    discord?: string
    website?: string
    email?: string
  }
  // KYC fields
  kycCompleted?: boolean
  kycVerified?: boolean
  kycStatus?: KycStatus
  kycDocumentType?: KycDocumentType
  kycDocumentUrl?: string
  kycFullName?: string
  kycSubmittedAt?: string
  kycVerifiedAt?: string
  kycVerifiedBy?: string
  createdAt: string
  updatedAt: string
  lastSeen?: string
}

export interface Post {
  id: string
  shortId: number // numeric short id
  authorId: string
  title?: string
  content: string
  postType: "project" | "help" | "showcase" | "team" | "general"
  tags?: string[]
  images?: string[] // urls/base64
  videos?: string[] // video urls
  githubUrl?: string
  figmaUrl?: string
  websiteUrl?: string
  likesCount: number
  commentsCount: number
  createdAt: string
  updatedAt: string
}

export interface Comment {
  id: string
  postId: string
  authorId: string
  parentCommentId?: string
  content: string
  likesCount: number
  repliesCount: number
  createdAt: string
  updatedAt: string
}

export interface Event {
  id: string
  title: string
  description?: string
  creatorId: string // The user who created the event
  eventDate: string // yyyy-mm-dd
  startTime: string // HH:mm
  endTime: string // HH:mm
  eventType: "marketing" | "social" | "workshop" | "1on1" | "study_group" | "hackathon" | "meetup" | "conference" | "networking"
  location: string // physical address or 'online'
  locationType: "online" | "physical" | "hybrid"
  maxAttendees: number
  currentAttendeesCount: number
  waitlistCount: number
  isPublic: boolean
  isRecurring: boolean
  tags?: string[]
  requirements?: string[]
  materials?: string[]
  xpReward: number
  skillLevel: "beginner" | "intermediate" | "advanced" | "all"
  status: "draft" | "published" | "ongoing" | "completed" | "cancelled"
  capacityType: "unlimited" | "limited" | "invite_only"
  checkInCode?: string
  cost: number
  currency: string
  ageRestriction?: string
  prerequisites?: string[]
  learningObjectives?: string[]
  materialsProvided?: string[]
  contactPhone?: string
  socialLinks?: Record<string, string>
  mediaUrls?: string[]
  bannerImage?: string
  logoImage?: string
  coverImage?: string
  approvalStatus: "pending" | "approved" | "rejected" | "needs_review"
  approvedBy?: string
  approvedAt?: string
  rejectionReason?: string
  isFeatured: boolean
  priority: number
  externalUrl?: string
  registrationUrl?: string
  // Organizers
  organizers?: EventOrganizer[]
  createdAt: string
  updatedAt: string
}

export interface EventOrganizer {
  id: string
  eventId: string
  organizerType: "user" | "team"
  organizerId: string // Either userId or teamId
  role: "primary" | "secondary" | "co_organizer"
  addedAt: string
  addedBy: string // User who added this organizer
  // Populated fields
  user?: User
  team?: Team
}

export interface Booking {
  id: string
  eventId: string
  userId: string
  status: "confirmed" | "waitlisted" | "cancelled" | "no_show" | "attended"
  bookedAt: string
  checkedIn: boolean
  checkedInAt?: string
  xpAwarded: boolean
  waitlistPosition?: number
  notes?: string
}

export interface EventAttendance {
  id: string
  eventId: string
  userId: string
  status: "registered" | "attended" | "no_show" | "cancelled"
  registeredAt: string
  attendedAt?: string
  checkInCode?: string
  notes?: string
  feedbackRating?: number
  feedbackComment?: string
  xpEarned: number
  createdAt: string
  updatedAt: string
}

export interface EventFeedback {
  id: string
  eventId: string
  userId: string
  rating: number
  comment?: string
  helpful: boolean
  wouldRecommend: boolean
  createdAt: string
  updatedAt: string
}

export interface EventCategory {
  id: string
  name: string
  description?: string
  color: string
  icon?: string
  isActive: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface RecurringPattern {
  id: string
  eventId: string
  frequency: "daily" | "weekly" | "monthly"
  intervalCount: number
  endDate?: string
  daysOfWeek?: string[]
  maxOccurrences?: number
  createdAt: string
}

export interface Checkin {
  id: string
  userId: string
  date: string // yyyy-mm-dd
  qrCode: string // payload scanned
  checkedInAt: string
  location?: string
}

export interface Achievement {
  id: string
  name: string
  description?: string
  icon?: string
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary"
  xpReward: number
  requirements?: Record<string, any>
}

export interface UserBadge {
  id: string
  userId: string
  badgeId: string
  badgeName: string
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary"
  unlockedAt: string
}

export interface Team {
  id: string
  name: string
  description?: string
  avatarUrl?: string
  skills?: string[] // skills the team has
  skillsRequired?: string[] // skills the team is looking for
  createdBy: string
  maxMembers: number
  currentMemberCount: number // calculated field
  status: 'recruiting' | 'active' | 'completed' | 'archived'
  projectType?: 'hackathon' | 'startup' | 'learning' | 'freelance' | 'open_source'
  timeline?: string // "3 months", "ongoing", etc.
  location?: 'remote' | 'hybrid' | 'onsite' | string
  // Links
  githubUrl?: string
  figmaUrl?: string
  websiteUrl?: string
  discordUrl?: string
  // Gamification
  totalXp: number
  teamLevel: number
  // Additional info
  foundedDate?: string
  budgetRange?: string
  equitySplit?: Record<string, number>
  meetingSchedule?: string
  tags?: string[]
  // Metadata
  createdAt: string
  updatedAt: string
}

export interface TeamMember {
  id: string
  teamId: string
  userId: string
  role: 'leader' | 'co_leader' | 'developer' | 'designer' | 'pm' | 'marketing' | 'member'
  permissions: string[]
  joinedAt: string
  contributionScore: number
  isActive: boolean
  // Populated fields from API
  user?: {
    id: string
    display_name?: string
    avatar_url?: string
    bio?: string
    skills?: string[]
    email?: string
  }
}

export interface TeamInvitation {
  id: string
  team_id: string
  inviter_id: string
  invitee_id: string
  invitee_email?: string
  status: 'pending' | 'accepted' | 'declined' | 'expired'
  role: TeamMember['role']
  message?: string
  expires_at: string
  created_at: string
  // Populated fields from API
  team?: {
    id: string
    name: string
    description?: string
    avatar_url?: string
    created_by: string
  }
  inviter?: {
    id: string
    display_name?: string
    avatar_url?: string
  }
}

// Enhanced Project System Types

export interface Project {
  id: string
  
  // Basic Information
  name: string
  tagline?: string
  description?: string
  longDescription?: string
  
  // Ownership & Team
  teamId?: string
  createdBy: string
  team?: Team
  
  // Status & Progress
  status: 'planning' | 'in_progress' | 'completed' | 'published' | 'archived'
  progress: number // 0-100
  
  // Project Details
  projectType?: 'web_app' | 'mobile_app' | 'game' | 'defi' | 'nft' | 'dao' | 'tool' | 'library' | 'other'
  category: string[]
  tags: string[]
  
  // Media (Steam-style)
  bannerImage?: string
  logoImage?: string
  screenshots: string[]
  videos: string[]
  demoImages: string[]
  
  // Links & Resources
  githubUrl?: string
  demoUrl?: string
  websiteUrl?: string
  docsUrl?: string
  figmaUrl?: string
  discordUrl?: string
  twitterUrl?: string
  
  // Technical Details
  techStack: string[]
  blockchain: string[]
  smartContracts: Record<string, any>
  
  // Project Metrics
  githubStars: number
  githubForks: number
  websiteVisits: number
  demoInteractions: number
  
  // Dates & Timeline
  startDate?: string
  endDate?: string
  launchDate?: string
  lastUpdatedAt: string
  
  // Publishing & Visibility
  isPublic: boolean
  isFeatured: boolean
  featuredPriority: number
  
  // Engagement
  viewsCount: number
  likesCount: number
  bookmarksCount: number
  
  // Relations
  contributors?: ProjectContributor[]
  updates?: ProjectUpdate[]
  
  // Metadata
  createdAt: string
  updatedAt: string
}

export interface ProjectContributor {
  id: string
  projectId: string
  userId: string
  user?: User
  role: 'lead' | 'developer' | 'designer' | 'pm' | 'marketing' | 'contributor'
  contributionDescription?: string
  hoursContributed: number
  isActive: boolean
  joinedAt: string
}

export interface ProjectUpdate {
  id: string
  projectId: string
  title: string
  content: string
  updateType: 'general' | 'feature' | 'bugfix' | 'release' | 'milestone'
  version?: string
  images: string[]
  createdBy: string
  createdAt: string
  author?: User
}

export interface ProjectLike {
  id: string
  projectId: string
  userId: string
  createdAt: string
}

export interface ProjectBookmark {
  id: string
  projectId: string
  userId: string
  createdAt: string
}

export interface ProjectView {
  id: string
  projectId: string
  userId?: string
  ipAddress?: string
  userAgent?: string
  viewedAt: string
}

// Legacy type for backward compatibility
export interface TeamProject extends Project {
  teamId: string
}

export interface TeamAchievement {
  id: string
  teamId: string
  achievementType: string
  title: string
  description: string
  xpReward: number
  earnedAt: string
}

export interface Notification {
  id: string
  userId: string
  type: string
  title: string
  message: string
  data?: any
  readAt?: string
  createdAt: string
}

export interface XpTransaction {
  id: string
  userId: string
  activity: string
  xp: number
  timestamp: string
  details?: any
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
}

// Gamification constants - Comprehensive XP system
export const XP_VALUES = {
  // Daily Activities
  DAILY_CHECKIN: 15,
  
  // Content Creation (High Value)
  CREATE_POST: 25,
  CREATE_PROJECT: 150,
  COMPLETE_PROJECT: 300,
  CREATE_TEAM: 100,
  HOST_EVENT: 120,
  CREATE_NEWS_ARTICLE: 200,
  
  // Team Activities (High Value)
  JOIN_TEAM: 50,
  LEAVE_TEAM: -10, // Small penalty for leaving
  INVITE_TO_TEAM: 30,
  ACCEPT_TEAM_INVITE: 25,
  BECOME_TEAM_LEADER: 75,
  TEAM_PROJECT_COMPLETE: 400, // Bonus for team projects
  
  // Event Participation
  ATTEND_EVENT: 40,
  HOST_1ON1: 60,
  HOST_STUDY_GROUP: 80,
  HOST_WORKSHOP: 120,
  HOST_HACKATHON: 200,
  EVENT_CHECKIN: 20,
  EVENT_FEEDBACK: 15,
  
  // Social Engagement (Medium Value)
  LIKE_POST: 2,
  COMMENT_POST: 8,
  LIKE_COMMENT: 1,
  REPLY_TO_COMMENT: 5,
  SHARE_POST: 10,
  BOOKMARK_POST: 3,
  
  // News & Articles Engagement
  LIKE_ARTICLE: 3,
  COMMENT_ARTICLE: 12,
  SHARE_ARTICLE: 15,
  BOOKMARK_ARTICLE: 5,
  VIEW_ARTICLE: 1, // Daily cap needed
  
  // Project Engagement
  LIKE_PROJECT: 5,
  COMMENT_PROJECT: 15,
  BOOKMARK_PROJECT: 8,
  VIEW_PROJECT: 2,
  STAR_PROJECT: 10,
  FORK_PROJECT: 20,
  
  // User Progression
  COMPLETE_ONBOARDING: 75,
  COMPLETE_PROFILE: 50,
  UPLOAD_AVATAR: 10,
  VERIFY_EMAIL: 30,
  FIRST_LOGIN: 25,
  UPDATE_PROFILE: 5,
  
  // Special Achievements
  FIRST_POST: 50,
  FIRST_PROJECT: 100,
  FIRST_TEAM_CREATION: 125,
  FIRST_EVENT_HOST: 150,
  STREAK_MILESTONE_7: 50,
  STREAK_MILESTONE_30: 200,
  STREAK_MILESTONE_100: 500,
  STREAK_MILESTONE_365: 1000,
  
  // Community Building
  INVITE_USER: 25,
  REFER_USER: 50,
  MENTOR_USER: 100,
  GET_MENTORED: 75,
  
  // Content Quality (Bonus XP)
  HIGH_QUALITY_POST: 50, // Based on engagement metrics
  VIRAL_POST: 200, // 100+ likes/comments
  TRENDING_ARTICLE: 300, // High view count
  FEATURED_PROJECT: 500, // Admin featured
  
  // Collaboration
  COLLABORATE_ON_PROJECT: 75,
  CODE_REVIEW: 25,
  BUG_REPORT: 15,
  FEATURE_REQUEST: 10,
  CONTRIBUTE_TO_OPEN_SOURCE: 100,
  
  // Learning & Development
  COMPLETE_TUTORIAL: 50,
  COMPLETE_COURSE: 150,
  ATTEND_WORKSHOP: 60,
  COMPLETE_HACKATHON: 300,
  WIN_HACKATHON: 500,
  WIN_EVENT: 200,
  
  // Moderation & Community
  REPORT_CONTENT: 5,
  HELP_MODERATE: 30,
  COMMUNITY_HELPER: 100,
  
  // Long-term Engagement
  MONTHLY_ACTIVE_USER: 100, // 30+ days active in month
  QUARTERLY_ACTIVE_USER: 300, // 90+ days active in quarter
  YEARLY_ACTIVE_USER: 1000, // 365+ days active in year
} as const

export const RANK_THRESHOLDS = [
  { name: "Newcomer", minXp: 0 },
  { name: "Explorer", minXp: 100 },
  { name: "Builder", minXp: 300 },
  { name: "Contributor", minXp: 600 },
  { name: "Innovator", minXp: 1000 },
  { name: "Leader", minXp: 1500 },
  { name: "Expert", minXp: 2500 },
  { name: "Master", minXp: 4000 },
  { name: "Solana Legend", minXp: 6000 },
] as const
