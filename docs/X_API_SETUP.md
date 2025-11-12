# X (Twitter) API Setup Guide

This guide explains how to set up X API integration to automatically sync posts from the Web3Recap X account to your website feed.

## How It Works

Instead of using webhooks (which require special access), we use X API v2 to periodically fetch tweets and create posts. This is simpler and works with standard API access.

## Step 1: Get X API Credentials

1. Go to [X Developer Portal](https://developer.twitter.com/)
2. Create a new App or use an existing one
3. Navigate to "Keys and tokens" section
4. Generate a **Bearer Token** (`X_BEARER_TOKEN`)

### Getting Bearer Token

1. In X Developer Portal, go to your App → "Keys and tokens"
2. Under "Bearer Token", click "Generate"
3. Copy the token (you'll only see it once!)

### Getting User ID (Optional)

You can either set `X_USER_ID` directly or use `X_USERNAME` (we'll fetch the ID automatically).

**Option 1: Get User ID from API**
```bash
curl "https://api.twitter.com/2/users/by/username/web3recapio" \
  -H "Authorization: Bearer YOUR_BEARER_TOKEN"
```

Copy the `id` field from the response.

**Option 2: Use Username (Automatic)**
Just set `X_USERNAME=web3recapio` and we'll fetch the ID automatically.

## Step 2: Configure Environment Variables

Add these to your `.env.local` file:

```env
# X (Twitter) API credentials
X_BEARER_TOKEN=your_bearer_token_here
X_USER_ID=your_x_user_id_here
# Optional: If X_USER_ID is not set, we'll fetch it from username
X_USERNAME=web3recapio

# Cron secret for securing the sync endpoint
CRON_SECRET=your_random_secret_here
```

## Step 3: Set Up Automatic Syncing

### Option A: Vercel Cron Jobs (Recommended)

If you're using Vercel, add this to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/sync-x-posts",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

This will sync every 15 minutes. Adjust the schedule as needed:
- `*/15 * * * *` - Every 15 minutes
- `*/30 * * * *` - Every 30 minutes
- `0 * * * *` - Every hour

**Important:** Set the `CRON_SECRET` environment variable in Vercel and configure the authorization header.

### Option B: External Cron Service

Use a service like [cron-job.org](https://cron-job.org) or [EasyCron](https://www.easycron.com/):

1. Create a new cron job
2. Set the URL: `https://yourdomain.com/api/cron/sync-x-posts`
3. Add header: `Authorization: Bearer YOUR_CRON_SECRET`
4. Set schedule (e.g., every 15 minutes)

### Option C: Manual Sync

You can manually trigger the sync by calling:

```bash
curl -X GET "https://yourdomain.com/api/cron/sync-x-posts" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Or visit the URL in your browser (if `CRON_SECRET` is not set, it will work but is less secure).

## Step 4: Test the Integration

1. Post a tweet from your X account (@web3recapio)
2. Wait for the cron job to run (or trigger it manually)
3. Check your website feed - the tweet should appear as a post

## API Endpoints

### GET `/api/cron/sync-x-posts`

Syncs recent tweets from X API to your website feed.

**Headers:**
- `Authorization: Bearer <CRON_SECRET>` (optional, but recommended)

**Response:**
```json
{
  "success": true,
  "message": "Synced 3 new posts, skipped 0 duplicates",
  "synced": 3,
  "skipped": 0,
  "total": 3
}
```

### GET `/api/x/tweets`

Returns the latest tweets from the configured X account without persisting them to the database. Replies are excluded by default.

**Query Parameters:**
- `limit` (optional, default `10`, max `100`)
- `sinceId` (optional) Only return tweets newer than the specified tweet ID
- `excludeReplies` (optional, default `true`) Set to `false` to include replies
- `excludeRetweets` (optional, default `false`) Set to `true` to exclude retweets
- `username` (optional) Override the configured username lookup

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "1234567890",
      "text": "Example tweet",
      "created_at": "2024-05-01T12:00:00.000Z",
      "referenced_tweets": []
      // ...standard X API tweet fields
    }
  ],
  "includes": {
    "media": [],
    "users": []
  },
  "meta": {
    "result_count": 1
  }
}
```

## How It Works

1. **Fetch Tweets**: Uses X API v2 to fetch recent tweets from your account
2. **Check Duplicates**: Verifies if a post with the same content already exists
3. **Extract Media**: Extracts images from tweets
4. **Extract URLs**: Extracts links from tweets (excluding Twitter/X links)
5. **Create Posts**: Creates posts in your database with:
   - Content: Tweet text (with URLs removed)
   - Images: Any attached media
   - Tags: `['x', 'twitter', 'web3recap']`
   - Author: System user (x@web3recap.io)

## Features

- ✅ **Duplicate Prevention**: Checks for existing posts before creating
- ✅ **Media Extraction**: Automatically extracts images from tweets
- ✅ **URL Extraction**: Extracts links from tweets
- ✅ **Auto User Creation**: Creates system user (`x@web3recap.io`) for X posts
- ✅ **Secure**: Optional cron secret for endpoint protection

## Troubleshooting

### No posts are being created

1. **Check Bearer Token**: Verify `X_BEARER_TOKEN` is set correctly
2. **Check User ID/Username**: Ensure `X_USER_ID` or `X_USERNAME` is correct
3. **Check API Access**: Verify your X API app has read access
4. **Check Logs**: Look at server logs for error messages

### Posts are created but images are missing

1. Check if tweets have media attachments
2. Verify X API response includes media in `includes.media`
3. Check if media URLs are accessible

### Rate Limiting

X API has rate limits:
- **User Tweets**: 75 requests per 15 minutes (per user)

If you hit rate limits, reduce the sync frequency or use pagination.

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `X_BEARER_TOKEN` | X API Bearer Token | Yes |
| `X_USER_ID` | X User ID | No (if `X_USERNAME` is set) |
| `X_USERNAME` | X Username (e.g., `web3recapio`) | No (if `X_USER_ID` is set) |
| `CRON_SECRET` | Secret for securing cron endpoint | Recommended |

## Notes

- The system automatically creates a user account (`x@web3recap.io`) for X posts
- Duplicate posts are prevented by checking content and author
- Images from tweets are automatically extracted and added to posts
- URLs in tweets are extracted and added to the `website_url` field
- Only tweets from the configured X account are synced

## Next Steps

1. Set up the cron job to run automatically
2. Test by posting a tweet and verifying it appears in your feed
3. Adjust sync frequency based on your posting schedule
4. Monitor logs to ensure syncing is working correctly

