import { NextRequest, NextResponse } from 'next/server'
import {
  fetchRecentTweets,
  getUserProfileByUsername,
  searchRecentTweetsByUsername,
  type XUser,
} from '@/lib/x-api/client'

// In-memory cache to reduce X API calls and mitigate 429s during development/SSR
const CACHE_TTL_MS = 2 * 60 * 1000 // 2 minutes
type CacheEntry = { timestamp: number; payload: any }
const cache = new Map<string, CacheEntry>()

function getCacheKey(
  userId: string,
  maxResults: number,
  excludeReplies: boolean,
  excludeRetweets: boolean,
  sinceId?: string
) {
  return [
    'tweets',
    userId,
    maxResults,
    excludeReplies ? 'no-replies' : 'with-replies',
    excludeRetweets ? 'no-retweets' : 'with-retweets',
    sinceId ?? 'no-since',
  ].join(':')
}

function parseBoolean(param: string | null, defaultValue: boolean): boolean {
  if (param === null) {
    return defaultValue
  }

  if (param === '1' || param.toLowerCase() === 'true') {
    return true
  }

  if (param === '0' || param.toLowerCase() === 'false') {
    return false
  }

  return defaultValue
}

export async function GET(request: NextRequest) {
  try {
    const bearerToken =
      process.env.X_BEARER_TOKEN ||
      process.env.TWITTER_BEARER_TOKEN ||
      process.env.X_TWITTER_BEARER_TOKEN ||
      process.env.NEXT_PUBLIC_X_BEARER_TOKEN
    if (!bearerToken) {
      return NextResponse.json(
        { success: false, error: 'X_BEARER_TOKEN not configured' },
        { status: 500 }
      )
    }

    const { searchParams } = new URL(request.url)
    const maxResultsParam = searchParams.get('limit')
    const sinceId = searchParams.get('sinceId') ?? undefined
    const excludeRepliesParam = searchParams.get('excludeReplies')
    const excludeRetweetsParam = searchParams.get('excludeRetweets')
    const usernameParam = searchParams.get('username')

    const maxResults = maxResultsParam
      ? Math.min(Math.max(Number.parseInt(maxResultsParam, 10) || 1, 1), 100)
      : 10

    const excludeReplies = parseBoolean(excludeRepliesParam, true)
    const excludeRetweets = parseBoolean(excludeRetweetsParam, false)

    let userId = process.env.X_USER_ID
    let userProfile: XUser | null = null

    if (!userId) {
      const username =
        usernameParam ??
        process.env.X_USERNAME ??
        'web3recapio'

      userProfile = await getUserProfileByUsername(bearerToken, username)
      if (!userProfile) {
        return NextResponse.json(
          { success: false, error: 'Unable to resolve X user by username' },
          { status: 500 }
        )
      }

      userId = userProfile.id
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'X user ID not available' },
        { status: 500 }
      )
    }

    // Cache lookup (performed after we know userId and options)
    const cacheKey = getCacheKey(userId, maxResults, excludeReplies, excludeRetweets, sinceId)
    const now = Date.now()
    const cached = cache.get(cacheKey)
    if (cached && now - cached.timestamp < CACHE_TTL_MS) {
      return NextResponse.json(cached.payload, { headers: { 'x-cache': 'HIT' } })
    }

    let tweetsResponse = await fetchRecentTweets(
      bearerToken,
      userId,
      sinceId,
      maxResults,
      {
        excludeReplies,
        excludeRetweets,
      }
    )

    let tweets =
      tweetsResponse.data?.filter((tweet) => {
        if (excludeReplies && tweet.referenced_tweets?.some((ref) => ref.type === 'replied_to')) {
          return false
        }

        if (excludeRetweets && tweet.referenced_tweets?.some((ref) => ref.type === 'retweeted')) {
          return false
        }

        return true
      }) ?? []

    // Fallback: if empty, use v2 recent search by username (no user-id lookup)
    if (tweets.length === 0 && (usernameParam || process.env.X_USERNAME)) {
      const fallbackUsername = (usernameParam || process.env.X_USERNAME || 'web3recapio') as string
      try {
        const searchResp = await searchRecentTweetsByUsername(
          bearerToken,
          fallbackUsername,
          maxResults,
          { excludeReplies, excludeRetweets }
        )
        tweets = searchResp.data ?? []
        // Merge includes/meta/ratelimit if present
        tweetsResponse = {
          ...tweetsResponse,
          includes: searchResp.includes ?? tweetsResponse.includes,
          meta: searchResp.meta ?? tweetsResponse.meta,
          rateLimit: (searchResp as any).rateLimit ?? (tweetsResponse as any).rateLimit,
        } as any
      } catch {
        // ignore and continue
      }
    }

    const payload = {
      success: true,
      data: tweets,
      includes: tweetsResponse.includes,
      meta: tweetsResponse.meta,
      rateLimit: (tweetsResponse as any).rateLimit,
    }

    // Store in cache
    cache.set(cacheKey, { timestamp: now, payload })

    const headers: Record<string, string> = { 'x-cache': cached ? 'MISS-REFRESH' : 'MISS' }
    if (tweetsResponse.rateLimit) {
      if (tweetsResponse.rateLimit.limit !== undefined) headers['x-rate-limit-limit'] = String(tweetsResponse.rateLimit.limit)
      if (tweetsResponse.rateLimit.remaining !== undefined) headers['x-rate-limit-remaining'] = String(tweetsResponse.rateLimit.remaining)
      if (tweetsResponse.rateLimit.reset !== undefined) headers['x-rate-limit-reset'] = String(tweetsResponse.rateLimit.reset)
    }

    return NextResponse.json(payload, { headers })
  } catch (error) {
    console.error('Failed to fetch X tweets:', error)

    // If upstream rate-limited us, try serve stale if present
    const message = error instanceof Error ? error.message : String(error)
    if (message.includes(' 429 ') || /Too Many Requests/i.test(message)) {
      let freshest: CacheEntry | null = null
      for (const entry of cache.values()) {
        if (!freshest || entry.timestamp > freshest.timestamp) {
          freshest = entry
        }
      }
      if (freshest) {
        return NextResponse.json(freshest.payload, {
          headers: { 'x-cache': 'STALE', 'x-upstream': '429' },
        })
      }
    }

    // Graceful fallback: return empty list so UI doesn't break
    return NextResponse.json({
      success: true,
      data: [],
      includes: undefined,
      meta: { note: 'fallback-empty', error: message },
    }, { headers: { 'x-upstream': 'error' } })
  }
}

