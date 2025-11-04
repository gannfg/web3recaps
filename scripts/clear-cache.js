#!/usr/bin/env node

/**
 * Clear Next.js and Node.js caches to fix slow dev server startup
 */

const fs = require('fs')
const path = require('path')

console.log('🧹 Clearing caches to speed up dev server...')

const cacheDirs = [
  '.next',
  'node_modules/.cache',
  '.turbo',
]

const cacheFiles = [
  'package-lock.json',
  'pnpm-lock.yaml',
  'yarn.lock',
]

// Remove cache directories
cacheDirs.forEach(dir => {
  const fullPath = path.join(process.cwd(), dir)
  if (fs.existsSync(fullPath)) {
    console.log(`🗑️  Removing ${dir}`)
    fs.rmSync(fullPath, { recursive: true, force: true })
  }
})

// Remove lock files (will be regenerated)
cacheFiles.forEach(file => {
  const fullPath = path.join(process.cwd(), file)
  if (fs.existsSync(fullPath)) {
    console.log(`🗑️  Removing ${file}`)
    fs.unlinkSync(fullPath)
  }
})

console.log('✅ Cache cleared! Run "pnpm install" then "pnpm dev" for faster startup.')
