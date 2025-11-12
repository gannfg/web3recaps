import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase/server'
import { cleanTweetText, extractMediaFromTweet, extractUrlsFromTweet, type XTweetsResponse } from '@/lib/x-api/client'

const STREAM_URL = 'https://api.twitter.com/2/tweets/search/stream?tweet.fields=id,text,created_at,attachments,entities,referenced_tweets&expansions=attachments.media_keys,author_id&media.fields=type,url,preview_image_url&user.fields=id,username,name,profile_image_url,description'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const bearer = process.env.X_BEARER_TOKEN || process.env.TWITTER_BEARER_TOKEN || process.env.NEXT_PUBLIC_X_BEARER_TOKEN
    if (!bearer) {
      return NextResponse.json({ success: false, error: 'X_BEARER_TOKEN not configured' }, { status: 500 })
    }

    // Optional security: require CRON_SECRET outside dev
    const cronSecret = process.env.CRON_SECRET
    const isDev = process.env.NODE_ENV === 'development'
    if (cronSecret && !isDev) {
      const auth = request.headers.get('authorization')
      if (auth !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
      }
    }

    const supabase = createSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Supabase not configured' }, { status: 500 })
    }

    const controller = new AbortController()
    const timeoutMs = Math.min(2 * 60 * 1000, Number(process.env.X_STREAM_WINDOW_MS || 60000)) // default 60s
    const timeout = setTimeout(() => controller.abort('timeout'), timeoutMs)

    const resp = await fetch(STREAM_URL, {
      headers: {
        'Authorization': `Bearer ${bearer}`,
      },
      signal: controller.signal,
      cache: 'no-store',
    })

    if (!resp.ok || !resp.body) {
      clearTimeout(timeout)
      const text = await resp.text().catch(() => '')
      return NextResponse.json({ success: false, error: `Stream error: ${resp.status} - ${text}` }, { status: 502 })
    }

    // Ensure system user exists
    const xEmail = 'x@web3recap.io'
    let xUserId: string
    {
      const { data: existing } = await supabase.from('users').select('id').eq('email', xEmail).single()
      if (existing?.id) {
        xUserId = existing.id
      } else {
        const { data: created, error } = await supabase
          .from('users')
          .insert({
            email: xEmail,
            display_name: 'Web3Recap',
            role: 'ADMIN',
            bio: 'Official Web3Recap X account',
            avatar_url: '/logo.png',
            social_links: { twitter: 'https://x.com/Web3Recapio' },
            email_verified: true,
            auth_provider: 'email',
          })
          .select('id')
          .single()
        if (error) {
          clearTimeout(timeout)
          return NextResponse.json({ success: false, error: 'Failed to ensure X system user' }, { status: 500 })
        }
        xUserId = created!.id
      }
    }

    const reader = resp.body.getReader()
    const decoder = new TextDecoder()

    let processed = 0
    let skipped = 0
    let buffer = ''

    try {
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        let newlineIndex: number
        while ((newlineIndex = buffer.indexOf('\r\n')) >= 0) {
          const line = buffer.slice(0, newlineIndex).trim()
          buffer = buffer.slice(newlineIndex + 2)
          if (!line) continue

          // Each line is a JSON object { data, includes, matching_rules }
          let obj: { data?: any; includes?: XTweetsResponse['includes'] } = {}
          try {
            obj = JSON.parse(line)
          } catch {
            continue
          }

          const tweet = obj.data
          if (!tweet || !tweet.text) continue

          // Skip replies (rule already tries to exclude)
          const isReply = tweet.referenced_tweets?.some((r: any) => r.type === 'replied_to')
          if (isReply) {
            skipped++
            continue
          }

          const includes = obj.includes
          const cleanText = cleanTweetText(tweet)

          // De-duplicate by content + author
          const { data: existing } = await supabase
            .from('posts')
            .select('id')
            .eq('author_id', xUserId)
            .eq('content', cleanText)
            .limit(1)

          if (existing && existing.length > 0) {
            skipped++
            continue
          }

          const images = extractMediaFromTweet(tweet, includes)
          const urls = extractUrlsFromTweet(tweet)

          const { data: maxPosts } = await supabase
            .from('posts')
            .select('short_id')
            .order('short_id', { ascending: false })
            .limit(1)

          const shortId = (maxPosts && maxPosts.length > 0 && (maxPosts[0] as any)?.short_id ? (maxPosts[0] as any).short_id : 0) + 1

          const { error: insertError } = await supabase
            .from('posts')
            .insert({
              author_id: xUserId,
              title: null,
              content: cleanText,
              post_type: 'general',
              tags: ['x', 'twitter', 'web3recap'],
              images: images.length > 0 ? images : null,
              videos: [],
              website_url: urls.length > 0 ? urls[0] : null,
              short_id: shortId,
              likes_count: 0,
              comments_count: 0,
            })

          if (insertError) {
            skipped++
            continue
          }

          processed++
        }
      }
    } finally {
      clearTimeout(timeout)
      try {
        controller.abort()
      } catch {}
    }

    return NextResponse.json({ success: true, processed, skipped, windowMs: timeoutMs })
  } catch (e) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : 'Stream failed' }, { status: 500 })
  }
}


