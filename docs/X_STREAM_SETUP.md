# X API v2 Filtered Stream (Bearer token)

This project includes minimal endpoints to manage v2 filtered stream rules and to run a short-lived stream ingest that writes posts.

Endpoints:
- GET `/api/x/stream/rules` – Inspect current rules
- POST `/api/x/stream/rules` – Add a rule (defaults to `from:web3recapio -is:retweet -is:reply`)
- POST `/api/x/stream/start` – Opens the filtered stream for ~60s and ingests matching tweets

Environment:
```env
X_BEARER_TOKEN=your_bearer_token_here
# Optional: window for each run (ms)
X_STREAM_WINDOW_MS=60000
# Optional: require this for /start in non-dev
CRON_SECRET=your_random_secret_here
```

Usage:
```bash
# Add a rule (optional body to override username/value/tag)
curl -X POST http://localhost:3000/api/x/stream/rules \
  -H 'Content-Type: application/json' \
  -d '{"username":"web3recapio"}'

# Start a short-lived ingest window (60s by default)
curl -X POST http://localhost:3000/api/x/stream/start

# With auth in production (if CRON_SECRET is set)
curl -X POST http://localhost:3000/api/x/stream/start \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Notes:
- These are short-lived runs suitable for cron/on-demand tasks. Serverless environments are not ideal for a never-ending stream.
- Each line from the stream is parsed and inserted as a post (skips replies & duplicates; extracts basic media and external link).
- For a permanent worker, run a dedicated Node process or server with a persistent connection to `GET /2/tweets/search/stream`.


