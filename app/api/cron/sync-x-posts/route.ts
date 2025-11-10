import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase/server'
import {
  fetchRecentTweets,
  getUserIdByUsername,
  extractMediaFromTweet,
  extractUrlsFromTweet,
  cleanTweetText,
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
    const xUsername = process.env.X_USERNAME || 'web3recapio'

    // Allow specifying limit via query param (default 10)
    const { searchParams } = new URL(request.url)
    const limitParam = searchParams.get('limit')
    const maxResults = limitParam
      ? Math.min(Math.max(Number.parseInt(limitParam, 10) || 1, 1), 100)
      : 10

    if (!bearerToken) {
      return NextResponse.json({ error: 'X_BEARER_TOKEN not configured' }, { status: 500 })
    }

    // Get user ID if not provided
    let userId = xUserId
    if (!userId) {
      console.log('Fetching user ID from username:', xUsername)
      userId = await getUserIdByUsername(bearerToken, xUsername)
      if (!userId) {
        return NextResponse.json({ error: 'Failed to get X user ID' }, { status: 500 })
      }
      console.log('Found user ID:', userId)
    }

    const supabase = createSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
    }

    // Get or create X system user
    const xSystemUserId = await getOrCreateXUser(supabase)
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

/**
 * Get or create a system user for X posts
 */
async function getOrCreateXUser(supabase: any): Promise<string | null> {
  try {
    const xEmail = 'x@web3recap.io'

    // Try to find existing X system user
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', xEmail)
      .single()

    if (existingUser) {
      return existingUser.id
    }

    // Create new system user for X
    const { data: newUser, error } = await supabase
      .from('users')
      .insert({
        email: xEmail,
        display_name: 'Web3Recap',
        role: 'ADMIN',
        bio: 'Official Web3Recap X account',
        social_links: {
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

    return newUser.id
  } catch (error) {
    console.error('Error in getOrCreateXUser:', error)
    return null
  }
}

