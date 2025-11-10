import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase/server'
import {
  fetchRecentTweets,
  getUserProfileByUsername,
  getUserProfileById,
  extractMediaFromTweet,
  extractUrlsFromTweet,
  cleanTweetText,
  type XUser,
} from '@/lib/x-api/client'

/**
 * Cron endpoint to sync X (Twitter) posts to website feed
 * Call this endpoint periodically (e.g., every 15 minutes) to fetch new tweets
 * 
 * You can set this up with:
 * - Vercel Cron Jobs: https://vercel.com/docs/cron-jobs
 * - External cron service (cron-job.org, etc.)
 * - Or call manually from admin panel
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security (optional but recommended)
    // In development, allow access without auth for easier testing
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    const isDevelopment = process.env.NODE_ENV === 'development'

    // Only require auth if CRON_SECRET is set AND not in development mode
    if (cronSecret && !isDevelopment) {
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    const bearerToken = process.env.X_BEARER_TOKEN
    const xUserId = process.env.X_USER_ID
    const xUsername = process.env.X_USERNAME || 'Web3Recapio'

    // Allow specifying limit via query param (default 10)
    const { searchParams } = new URL(request.url)
    const limitParam = searchParams.get('limit')
    const maxResults = limitParam
      ? Math.min(Math.max(Number.parseInt(limitParam, 10) || 1, 1), 100)
      : 10

    if (!bearerToken) {
      return NextResponse.json({ error: 'X_BEARER_TOKEN not configured' }, { status: 500 })
    }

    // Get user ID/profile if not provided
    let userId = xUserId
    let userProfile: XUser | null = null
    if (!userId) {
      console.log('Fetching user ID from username:', xUsername)
      const profile = await getUserProfileByUsername(bearerToken, xUsername)
      if (!profile) {
        return NextResponse.json({ error: 'Failed to get X user profile' }, { status: 500 })
      }
      userId = profile.id
      userProfile = profile
      console.log('Found user ID:', userId)
    }

    if (userId && !userProfile) {
      try {
        userProfile = await getUserProfileById(bearerToken, userId)
      } catch (profileError) {
        console.warn('Unable to fetch X user profile by ID:', profileError)
      }
    }

    if (!userId) {
      return NextResponse.json({ error: 'X user ID unavailable' }, { status: 500 })
    }

    const supabase = createSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
    }

    // Get or create X system user
    const xSystemUserId = await getOrCreateXUser(supabase, userProfile || undefined)
    if (!xSystemUserId) {
      return NextResponse.json({ error: 'Failed to get or create X system user' }, { status: 500 })
    }

    // Get the most recent tweet ID we've already synced
    const { data: lastPost } = await supabase
      .from('posts')
      .select('content, created_at')
      .eq('author_id', xSystemUserId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    // Fetch recent tweets from X API
    const tweetsResponse = await fetchRecentTweets(
      bearerToken,
      userId,
      undefined, // sinceId - could use lastPost to only fetch new ones
      maxResults
    )

    const profileFromTweets = tweetsResponse.includes?.users?.find((u) => u.id === userId)
    if (profileFromTweets) {
      await updateXUserProfile(supabase, xSystemUserId, profileFromTweets)
    } else if (userProfile) {
      await updateXUserProfile(supabase, xSystemUserId, userProfile)
    }

    const tweets = tweetsResponse.data?.slice(0, maxResults) ?? []

    if (tweets.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No new tweets found',
        synced: 0,
        requested: maxResults,
      })
    }

    let syncedCount = 0
    let skippedCount = 0

    // Process each tweet
    for (const tweet of tweets) {
      try {
        // Skip replies (only sync original tweets)
        if (tweet.referenced_tweets?.some((ref) => ref.type === 'replied_to')) {
          skippedCount++
          continue
        }

        const cleanText = cleanTweetText(tweet)
        
        // Check if post already exists (prevent duplicates)
        const { data: existingPosts } = await supabase
          .from('posts')
          .select('id')
          .eq('content', cleanText)
          .eq('author_id', xSystemUserId)
          .limit(1)

        if (existingPosts && existingPosts.length > 0) {
          skippedCount++
          continue
        }

        // Extract media and URLs
        const images = extractMediaFromTweet(tweet, tweetsResponse.includes)
        const urls = extractUrlsFromTweet(tweet)

        // Get the next short_id
        const { data: maxPosts } = await supabase
          .from('posts')
          .select('short_id')
          .order('short_id', { ascending: false })
          .limit(1)

        const shortId = (maxPosts && maxPosts.length > 0 && maxPosts[0]?.short_id 
          ? maxPosts[0].short_id 
          : 0) + 1

        // Create post
        const { error: insertError } = await supabase
          .from('posts')
          .insert({
            author_id: xSystemUserId,
            title: null,
            content: cleanText,
            post_type: 'general',
            tags: ['x', 'twitter', 'web3recap'],
            images: images.length > 0 ? images : null,
            videos: [],
            github_url: null,
            figma_url: null,
            website_url: urls.length > 0 ? urls[0] : null,
            short_id: shortId,
            likes_count: 0,
            comments_count: 0,
          })

        if (insertError) {
          console.error('Error creating post from tweet:', insertError)
          continue
        }

        syncedCount++
      } catch (error) {
        console.error('Error processing tweet:', error)
        continue
      }
    }

    return NextResponse.json({
      success: true,
      message: `Synced ${syncedCount} new posts, skipped ${skippedCount} duplicates`,
      synced: syncedCount,
      skipped: skippedCount,
      total: tweets.length,
      requested: maxResults,
    })
  } catch (error) {
    console.error('Error syncing X posts:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to sync X posts',
      },
      { status: 500 }
    )
  }
}

function buildProfileFields(profile?: XUser, existingLinks?: Record<string, any>) {
  if (!profile) {
    return {}
  }

  const updates: Record<string, any> = {}

  if (profile.name) {
    updates.display_name = profile.name
  }

  if (profile.description) {
    updates.bio = profile.description
  }

  if (profile.profile_image_url) {
    updates.avatar_url = normalizeProfileImageUrl(profile.profile_image_url)
  }

  if (profile.username) {
    updates.social_links = {
      ...(existingLinks ?? {}),
      twitter: `https://x.com/${profile.username}`,
    }
  }

  return updates
}

function normalizeProfileImageUrl(url: string) {
  if (!url) return url
  return url.replace('_normal', '_400x400')
}

async function updateXUserProfile(
  supabase: any,
  userId: string,
  profile: XUser,
  existingLinks?: Record<string, any>
) {
  let links = existingLinks

  if (!links) {
    const { data: userRecord } = await supabase
      .from('users')
      .select('social_links')
      .eq('id', userId)
      .single()

    links = userRecord?.social_links ?? undefined
  }

  const updates = buildProfileFields(profile, links)
  if (Object.keys(updates).length === 0) {
    return
  }

  const { error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId)

  if (error) {
    console.error('Failed to update X user profile:', error)
  }
}

/**
 * Get or create a system user for X posts
 */
async function getOrCreateXUser(supabase: any, profile?: XUser): Promise<string | null> {
  try {
    const xEmail = 'x@web3recap.io'

    // Try to find existing X system user
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, social_links')
      .eq('email', xEmail)
      .single()

    if (existingUser) {
      if (profile) {
        await updateXUserProfile(supabase, existingUser.id, profile, existingUser.social_links)
      }
      return existingUser.id
    }

    const profileFields = buildProfileFields(profile)

    // Create new system user for X
    const { data: newUser, error } = await supabase
      .from('users')
      .insert({
        email: xEmail,
        display_name: profileFields.display_name ?? 'Web3Recap',
        role: 'ADMIN',
        bio: profileFields.bio ?? 'Official Web3Recap X account',
        avatar_url: profileFields.avatar_url ?? null,
        social_links: profileFields.social_links ?? {
          twitter: 'https://x.com/Web3Recapio',
        },
        email_verified: true,
        auth_provider: 'email',
      })
      .select('id')
      .single()

    if (error) {
      console.error('Error creating X user:', error)
      return null
    }

    if (profile) {
      await updateXUserProfile(supabase, newUser.id, profile, profileFields.social_links)
    }

    return newUser.id
  } catch (error) {
    console.error('Error in getOrCreateXUser:', error)
    return null
  }
}

