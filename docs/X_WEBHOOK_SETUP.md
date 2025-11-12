# X Webhook Setup

This project includes a webhook endpoint to ingest X (Twitter) activity and create posts without polling the API.

Endpoint:
- GET `/api/webhooks/x` – CRC challenge (Account Activity API v1.1)
- POST `/api/webhooks/x` – Activity delivery (e.g., `tweet_create_events`)

Environment:

```env
# Use your app consumer secret for CRC/signature verification
X_WEBHOOK_CONSUMER_SECRET=your_consumer_secret_here
```

What it does:
- Verifies webhook signatures (HMAC-SHA256) using `X_WEBHOOK_CONSUMER_SECRET`.
- Handles `tweet_create_events`.
- Skips replies by default.
- Creates a minimal post with the tweet text and first non-X link (no media extraction, to avoid extra API calls).

Permissions / Access:
- Direct X webhooks require the Account Activity API (v1.1), which is restricted to certain paid access levels.
- If your account does not have AAPI access, you can still use this endpoint by relaying events via a third-party:
  - Zapier “New Tweet by User” → Webhooks by Zapier → POST to `/api/webhooks/x`
  - Pipedream/TweetHook → HTTP request to `/api/webhooks/x`

CRC (Challenge-Response Check):
- When registering your webhook URL in X, X will send a `GET` request with `crc_token`.
- We respond with `{"response_token":"sha256=<base64_hmac>"}`.

Signature:
- X sends a header `x-twitter-webhooks-signature: sha256=<base64_hmac(raw_body)>`.
- This endpoint verifies it using `X_WEBHOOK_CONSUMER_SECRET`.

Testing:

```bash
# CRC test (replace TOKEN)
curl "http://localhost:3000/api/webhooks/x?crc_token=TEST_TOKEN"

# POST test (no signature)
curl -X POST "http://localhost:3000/api/webhooks/x" \
  -H "Content-Type: application/json" \
  -d '{"tweet_create_events":[{"id":"1","text":"Hello from webhook"}]}'
```

Production Tips:
- Protect the endpoint URL; avoid exposing it publicly.
- If you relay via a third-party, add a secret header and verify it server-side (extend the handler as needed).
- Media extraction is intentionally skipped to avoid additional API calls; if you need images, you’ll need API access.


