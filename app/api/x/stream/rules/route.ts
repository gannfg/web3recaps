import { NextRequest, NextResponse } from 'next/server'

const BASE = 'https://api.twitter.com/2/tweets/search/stream/rules'

function authHeaders() {
  const bearer = process.env.X_BEARER_TOKEN || process.env.TWITTER_BEARER_TOKEN || process.env.NEXT_PUBLIC_X_BEARER_TOKEN
  if (!bearer) return null
  return {
    'Authorization': `Bearer ${bearer}`,
    'Content-Type': 'application/json',
  }
}

export async function GET() {
  try {
    const headers = authHeaders()
    if (!headers) {
      return NextResponse.json({ success: false, error: 'X_BEARER_TOKEN not configured' }, { status: 500 })
    }
    const resp = await fetch(BASE, { headers, cache: 'no-store' })
    const json = await resp.json()
    return NextResponse.json({ success: true, data: json })
  } catch (e) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : 'Failed to fetch rules' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const headers = authHeaders()
    if (!headers) {
      return NextResponse.json({ success: false, error: 'X_BEARER_TOKEN not configured' }, { status: 500 })
    }

    const body = await request.json().catch(() => ({}))
    const username = (body.username as string) || process.env.X_USERNAME || 'web3recapio'
    const tag = body.tag ?? 'web3recapio-non-replies'
    const value = body.value ?? `from:${username} -is:retweet -is:reply`

    const resp = await fetch(BASE, {
      method: 'POST',
      headers,
      body: JSON.stringify({ add: [{ value, tag }] }),
    })

    const json = await resp.json()
    if (!resp.ok) {
      return NextResponse.json({ success: false, error: json }, { status: resp.status })
    }
    return NextResponse.json({ success: true, data: json })
  } catch (e) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : 'Failed to set rules' }, { status: 500 })
  }
}


