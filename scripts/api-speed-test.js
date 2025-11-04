// Benchmark API endpoints with auth and aggregated statistics
// Usage:
//   node scripts/api-speed-test.js                # local (http://localhost:3000)
//   TEST_URL=https://web3recap.io node scripts/api-speed-test.js

const { performance } = require('perf_hooks')
const https = require('https')
const http = require('http')

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000'
const API_BASE = `${BASE_URL}/api`

// Credentials for auth (provided by user for test env)
const TEST_CREDENTIALS = {
  email: 'calebjmartin@hotmail.com',
  password: '11111111',
}

const ENDPOINTS = [
  { name: 'User Profile', path: '/users/me', requiresAuth: true },
  { name: 'Teams List', path: '/teams', requiresAuth: true },
  // Note: team detail endpoint will be tested dynamically if a team id is found
  { name: 'Projects', path: '/projects', requiresAuth: true },
  { name: 'Events', path: '/events', requiresAuth: false },
  { name: 'News', path: '/news', requiresAuth: false },
]

const RUNS = Number(process.env.RUNS || 10)
const PARALLEL = Number(process.env.PARALLEL || 3)
const TIMEOUT_MS = 15000

function httpRequest(url, { method = 'GET', headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const start = performance.now()
    const isHttps = url.startsWith('https')
    const client = isHttps ? https : http

    const req = client.request(
      url,
      {
        method,
        headers,
        timeout: TIMEOUT_MS,
      },
      (res) => {
        let data = ''
        res.on('data', (chunk) => (data += chunk))
        res.on('end', () => {
          const duration = performance.now() - start
          try {
            const json = JSON.parse(data)
            resolve({ status: res.statusCode, duration, size: data.length, json, headers: res.headers })
          } catch {
            resolve({ status: res.statusCode, duration, size: data.length, text: data, headers: res.headers })
          }
        })
      },
    )

    req.on('error', reject)
    req.on('timeout', () => {
      req.destroy()
      reject(new Error('Request timeout'))
    })

    if (body) req.write(JSON.stringify(body))
    req.end()
  })
}

async function authenticate() {
  const res = await httpRequest(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: TEST_CREDENTIALS,
  })
  if (res.status !== 200) throw new Error(`Auth failed: ${res.status}`)
  const setCookie = res.headers['set-cookie']
  const cookie = Array.isArray(setCookie) ? setCookie.join('; ') : setCookie
  return cookie || ''
}

function aggregateStats(samples) {
  const sorted = [...samples].sort((a, b) => a - b)
  const sum = samples.reduce((a, b) => a + b, 0)
  const avg = sum / samples.length
  const min = sorted[0]
  const max = sorted[sorted.length - 1]
  const p95 = sorted[Math.floor(sorted.length * 0.95) - 1] || max
  const p99 = sorted[Math.floor(sorted.length * 0.99) - 1] || max
  return { avg, min, max, p95, p99 }
}

async function runEndpoint(name, url, requiresAuth, cookie) {
  const durations = []
  let successes = 0
  let failures = 0
  let lastStatus = 0

  // run in small parallel batches
  for (let i = 0; i < RUNS; i += PARALLEL) {
    const batch = Array.from({ length: Math.min(PARALLEL, RUNS - i) }, () =>
      httpRequest(url, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          ...(requiresAuth && cookie ? { Cookie: cookie } : {}),
        },
      }),
    )

    const results = await Promise.allSettled(batch)
    for (const r of results) {
      if (r.status === 'fulfilled') {
        durations.push(r.value.duration)
        lastStatus = r.value.status
        if (r.value.status >= 200 && r.value.status < 300) successes++
        else failures++
      } else {
        failures++
      }
    }
  }

  const stats = durations.length ? aggregateStats(durations) : null
  return { name, url, requiresAuth, successes, failures, runs: RUNS, status: lastStatus, stats }
}

async function main() {
  console.log('\x1b[1mAPI Speed Test\x1b[0m')
  console.log(`Target: ${API_BASE}`)
  console.log(`Runs per endpoint: ${RUNS}, Parallel: ${PARALLEL}\n`)

  let cookie = ''
  try {
    cookie = await authenticate()
    console.log('Auth: \x1b[32mOK\x1b[0m')
  } catch (e) {
    console.log('Auth: \x1b[33mSkipped\x1b[0m (', e.message, ')')
  }

  // If possible, fetch one team id for detail testing
  let teamId = null
  try {
    const res = await httpRequest(`${API_BASE}/teams`, { headers: { Cookie: cookie } })
    if (res.status === 200 && res.json && Array.isArray(res.json.data) && res.json.data.length) {
      teamId = res.json.data[0].id
    }
  } catch {}

  const endpoints = [...ENDPOINTS]
  if (teamId) endpoints.push({ name: 'Team Detail', path: `/teams/${teamId}`, requiresAuth: true })

  const results = []
  for (const ep of endpoints) {
    const url = `${API_BASE}${ep.path}`
    process.stdout.write(`Testing ${ep.name} ... `)
    const r = await runEndpoint(ep.name, url, ep.requiresAuth, cookie)
    results.push(r)
    const ok = r.stats ? Math.round(r.stats.avg) + 'ms' : 'n/a'
    console.log(ok)
  }

  console.log('\n\x1b[1mRESULTS\x1b[0m')
  for (const r of results) {
    const line = [
      `- ${r.name}`,
      `(status: ${r.status || 'n/a'}, runs: ${r.runs}, ok: ${r.successes}, fail: ${r.failures})`,
    ]
    console.log(line.join(' '))
    if (r.stats) {
      console.log(
        `  avg: ${r.stats.avg.toFixed(0)}ms  min: ${r.stats.min.toFixed(0)}ms  max: ${r.stats.max.toFixed(0)}ms  p95: ${r.stats.p95.toFixed(0)}ms  p99: ${r.stats.p99.toFixed(0)}ms`,
      )
    }
  }

  // Quick recommendations
  const slow = results.filter((r) => r.stats && r.stats.avg > 1000)
  if (slow.length) {
    console.log('\n\x1b[33mRECOMMENDATIONS\x1b[0m')
    for (const r of slow) {
      console.log(`- ${r.name}: avg ${r.stats.avg.toFixed(0)}ms → investigate DB queries, add indexes, cache, paginate`) }
  }
}

main().catch((e) => {
  console.error('Error:', e)
  process.exit(1)
})
