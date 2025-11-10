/**
 * X API v2 Client
 * Fetches tweets from X API and creates posts
 */

export interface XTweet {
  id: string
  text: string
  author_id: string
  created_at: string
  referenced_tweets?: Array<{
    type: 'retweeted' | 'quoted' | 'replied_to'
    id: string
  }>
  attachments?: {
    media_keys?: string[]
  }
  entities?: {
    urls?: Array<{
      url: string
      expanded_url: string
      display_url: string
    }>
  }
}

export interface XMedia {
  media_key: string
  type: 'photo' | 'video' | 'animated_gif'
  url?: string
  preview_image_url?: string
}

export interface XUser {
  id: string
  username: string
  name: string
  profile_image_url?: string
  description?: string
}

export interface XTweetsResponse {
  data?: XTweet[]
  includes?: {
    media?: XMedia[]
    users?: XUser[]
  }
  meta?: {
    newest_id?: string
    oldest_id?: string
    result_count?: number
    next_token?: string
  }
}

/**
 * Fetch recent tweets from X API v2
 */
export async function fetchRecentTweets(
  bearerToken: string,
  userId: string,
  sinceId?: string,
  maxResults: number = 10
): Promise<XTweetsResponse> {
  const url = new URL('https://api.twitter.com/2/users/' + userId + '/tweets')
  
  const params: Record<string, string> = {
    'tweet.fields': 'id,text,created_at,attachments,entities,referenced_tweets',
    'expansions': 'attachments.media_keys,author_id',
    'media.fields': 'type,url,preview_image_url',
    'user.fields': 'id,username,name,profile_image_url,description',
    'max_results': String(maxResults),
  }

  if (sinceId) {
    params.since_id = sinceId
  }

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value)
  })

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${bearerToken}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`X API error: ${response.status} - ${errorText}`)
  }

  return await response.json()
}

/**
 * Get user profile by username
 */
export async function getUserProfileByUsername(
  bearerToken: string,
  username: string
): Promise<XUser | null> {
  const url = new URL(`https://api.twitter.com/2/users/by/username/${username}`)
  url.searchParams.append('user.fields', 'id,username,name,profile_image_url,description')

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${bearerToken}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`X API error: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  return data.data || null
}

/**
 * Get user profile by user ID
 */
export async function getUserProfileById(
  bearerToken: string,
  userId: string
): Promise<XUser | null> {
  const url = new URL(`https://api.twitter.com/2/users/${userId}`)
  url.searchParams.append('user.fields', 'id,username,name,profile_image_url,description')

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${bearerToken}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`X API error: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  return data.data || null
}

/**
 * Extract media URLs from tweet
 */
export function extractMediaFromTweet(tweet: XTweet, includes?: XTweetsResponse['includes']): string[] {
  const images: string[] = []

  if (tweet.attachments?.media_keys && includes?.media) {
    for (const mediaKey of tweet.attachments.media_keys) {
      const media = includes.media.find((m) => m.media_key === mediaKey)
      if (media) {
        if (media.type === 'photo' && media.url) {
          images.push(media.url)
        } else if (media.preview_image_url) {
          images.push(media.preview_image_url)
        }
      }
    }
  }

  return images
}

/**
 * Extract URLs from tweet (excluding media URLs)
 */
export function extractUrlsFromTweet(tweet: XTweet): string[] {
  const urls: string[] = []

  if (tweet.entities?.urls) {
    for (const url of tweet.entities.urls) {
      // Skip t.co URLs that are just media links or Twitter links
      if (
        url.expanded_url &&
        !url.expanded_url.includes('twitter.com/') &&
        !url.expanded_url.includes('x.com/')
      ) {
        urls.push(url.expanded_url)
      }
    }
  }

  return urls
}

/**
 * Clean tweet text (remove URLs)
 */
export function cleanTweetText(tweet: XTweet): string {
  let text = tweet.text

  if (tweet.entities?.urls) {
    for (const url of tweet.entities.urls) {
      text = text.replace(url.url, '').trim()
    }
  }

  return text.trim()
}

