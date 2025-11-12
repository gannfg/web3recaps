import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase/server'
import crypto from 'crypto'

/**
 * X (Twitter) Webhook endpoint
 * - GET: CRC challenge handler
 * - POST: Receive activity events (e.g., tweet_create_events)
 *
 * Notes:
 * - This endpoint verifies the X/Twitter webhook signature (HMAC-SHA256 of raw body)
 *   using the consumer secret in X_WEBHOOK_CONSUMER_SECRET.
 * - For standard access, the Account Activity API (webhooks) may not be available.
 *   You can also forward events from a 3rd-party (Zapier/Pipedream) to this endpoint.
 */

function json(res: any, init?: { status?: number; headers?: Record<string, string> }) {
  return NextResponse.json(res, init)
}

function getConsumerSecret(): string | null {
  return (
    process.env.X_WEBHOOK_CONSUMER_SECRET ||
    process.env.TWITTER_CONSUMER_SECRET ||
    process.env.X_CONSUMER_SECRET ||
    null
  )
}

// GET: CRC challenge handler (Account Activity API v1.1)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const crcToken = searchParams.get('crc_token')
    const consumerSecret = getConsumerSecret()

    if (!crcToken) {
      return json({ success: false, error: 'Missing crc_token' }, { status: 400 })
    }
    if (!consumerSecret) {
      return json({ success: false, error: 'X_WEBHOOK_CONSUMER_SECRET not configured' }, { status: 500 })
    }

    const hmac = crypto.createHmac('sha256', consumerSecret).update(crcToken).digest('base64')
    return json({ response_token: `sha256=${hmac}` })
  } catch (error) {
    return json(
      { success: false, error: error instanceof Error ? error.message : 'CRC failed' },
      { status: 500 }
    )
  }
}

// POST: Activity ingestion
export async function POST(request: NextRequest) {
  try {
    const consumerSecret = getConsumerSecret()
    const signatureHeader =
      request.headers.get('x-twitter-webhooks-signature') ||
      request.headers.get('x-hub-signature') || // some forwarders
      request.headers.get('x-webhook-signature')

    const raw = await request.text()

    // Verify signature when we have a consumer secret and header provided
    if (consumerSecret && signatureHeader) {
      const sig = signatureHeader.replace(/^sha256=/i, '').trim()
      const digest = crypto.createHmac('sha256', consumerSecret).update(raw).digest('base64')
      if (sig !== digest) {
        return json({ success: false, error: 'Invalid signature' }, { status: 401 })
      }
    }

    const payload = JSON.parse(raw || '{}')

    const supabase = createSupabaseAdmin()
    if (!supabase) {
      return json({ success: false, error: 'Supabase not configured' }, { status: 500 })
    }

    let processed = 0
    let skipped = 0

    // Handle tweet_create_events (AAPI v1.1)
    const tweetEvents: any[] = payload.tweet_create_events || []
    for (const tweet of tweetEvents) {
      try {
        // Exclude replies by default
        const isReply =
          tweet.in_reply_to_status_id ||
          tweet.in_reply_to_status_id_str ||
          tweet.in_reply_to_user_id ||
          tweet.in_reply_to_user_id_str
        if (isReply) {
          skipped++
          continue
        }

        const text: string =
          tweet.full_text || tweet.text || (tweet.extended_tweet && tweet.extended_tweet.full_text) || ''
        if (!text.trim()) {
          skipped++
          continue
        }

        // Ensure we have or create the system user that will author X posts
        const xUserId = await getOrCreateXUser(supabase)
        if (!xUserId) {
          skipped++
          continue
        }

        // Prevent duplicates by content and author
        const { data: existing } = await supabase
          .from('posts')
          .select('id')
          .eq('author_id', xUserId)
          .eq('content', text.trim())
          .limit(1)

        if (existing && existing.length > 0) {
          skipped++
          continue
        }

        // Extract a non-X link if present (best-effort)
        let websiteUrl: string | null = null
        const urls: any[] =
          (tweet.entities && tweet.entities.urls) ||
          (tweet.extended_tweet && tweet.extended_tweet.entities && tweet.extended_tweet.entities.urls) ||
          []
        for (const u of urls) {
          const expanded = u.expanded_url || u.url
          if (expanded && !/twitter\.com\/|x\.com\//i.test(expanded)) {
            websiteUrl = expanded
            break
          }
        }

        // Create a minimal post (no media extraction here to avoid API calls)
        const { error: insertError } = await supabase.from('posts').insert({
          author_id: xUserId,
          title: null,
          content: text.trim(),
          post_type: 'general',
          tags: ['x', 'twitter', 'web3recap'],
          images: null,
          videos: [],
          website_url: websiteUrl,
          short_id: await nextShortId(supabase),
          likes_count: 0,
          comments_count: 0,
        })

        if (insertError) {
          console.error('Webhook: failed to insert post', insertError)
          skipped++
          continue
        }

        processed++
      } catch (e) {
        console.error('Webhook: error processing tweet event', e)
        skipped++
      }
    }

    return json({
      success: true,
      received: tweetEvents.length,
      processed,
      skipped,
    })
  } catch (error) {
    console.error('X webhook error:', error)
    return json(
      { success: false, error: error instanceof Error ? error.message : 'Unexpected error' },
      { status: 500 }
    )
  }
}

async function nextShortId(supabase: any): Promise<number> {
  const { data } = await supabase.from('posts').select('short_id').order('short_id', { ascending: false }).limit(1)
  const last = data && data.length > 0 ? data[0].short_id || 0 : 0
  return (last as number) + 1
}

async function getOrCreateXUser(supabase: any): Promise<string | null> {
  const xEmail = 'x@web3recap.io'
  const { data: existing } = await supabase.from('users').select('id').eq('email', xEmail).single()
  if (existing?.id) return existing.id

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
    console.error('Webhook: failed to create system user', error)
    return null
  }
  return created.id
}


