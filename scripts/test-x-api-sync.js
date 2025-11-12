/**
 * Test script for X API sync
 * Run with: node scripts/test-x-api-sync.js
 * 
 * Make sure your dev server is running first: npm run dev
 */

const http = require('http');
const https = require('https');

async function testXAPISync() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  const args = process.argv.slice(2)
  const limitArg = args.find((arg) => arg.startsWith('--limit='))
  const limitValue = limitArg ? limitArg.split('=')[1] : undefined

  const urlObj = new URL('/api/cron/sync-x-posts', baseUrl)
  if (limitValue) {
    urlObj.searchParams.set('limit', limitValue)
  }

  const syncUrl = urlObj.toString()

  console.log('🧪 Testing X API Sync...')
  console.log('URL:', syncUrl)
  if (limitValue) {
    console.log(`Limiting to ${limitValue} tweet(s)`) 
  }
  console.log('')
  console.log('Make sure:')
  console.log('1. Your dev server is running (npm run dev)')
  console.log('2. X_BEARER_TOKEN is set in .env.local')
  console.log('3. X_USERNAME is set in .env.local (optional)')
  console.log('')

  const url = new URL(syncUrl)
  const isHttps = url.protocol === 'https:'
  const client = isHttps ? https : http

  return new Promise((resolve, reject) => {
    const req = client.request(
      url,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      },
      (res) => {
        let data = ''
        res.on('data', (chunk) => (data += chunk))
        res.on('end', () => {
          try {
            const json = JSON.parse(data)
            if (res.statusCode === 200) {
              console.log('✅ Sync successful!')
              console.log('Response:', JSON.stringify(json, null, 2))
            } else {
              console.log('❌ Sync failed!')
              console.log('Status:', res.statusCode)
              console.log('Error:', JSON.stringify(json, null, 2))
            }
            resolve(json)
          } catch (error) {
            console.log('Response:', data)
            resolve(data)
          }
        })
      }
    )

    req.on('error', (error) => {
      console.error('❌ Error testing sync:', error.message)
      console.error('')
      console.error('Make sure your dev server is running: npm run dev')
      reject(error)
    })

    req.end()
  })
}

testXAPISync().catch(console.error)

