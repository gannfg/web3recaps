/**
 * Replace insecure x-user-id header usage in API routes with Supabase auth cookies.
 *
 * What it does per file in app/api/**/route.ts:
 * - Replaces occurrences of:
 *     const userId = request.headers.get("x-user-id")
 *     if (!userId) { return NextResponse.json(...401) }
 *   with:
 *     const supabase = createSupabaseServer()
 *     if (!supabase) return NextResponse.json({ success: false, error: "Supabase not configured" }, { status: 500 })
 *     const { data: userRes, error: userErr } = await supabase.auth.getUser()
 *     if (userErr || !userRes.user) return NextResponse.json({ success: false, error: "User not authenticated" }, { status: 401 })
 *     const userId = userRes.user.id
 * - Ensures import of createSupabaseServer from @/lib/supabase/server exists.
 * - Does not change business logic beyond auth derivation.
 */

const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const API_DIR = path.join(ROOT, 'app', 'api')

/** Regexes */
const headerGetRegex = /const\s+userId\s*=\s*request\.headers\.get\(\s*["']x-user-id["']\s*\)\s*;?/i
const ifNoUserRegex = /if\s*\(\s*!userId\s*\)\s*\{[\s\S]*?\}/i

const importSupabaseRegex = /from\s+["']@\/lib\/supabase\/server["']/
const createSupabaseUsageRegex = /createSupabaseServer\(/

const authBlock = (
  'const supabase = createSupabaseServer()\n' +
  '    if (!supabase) return NextResponse.json({ success: false, error: "Supabase not configured" }, { status: 500 })\n' +
  '    const { data: userRes, error: userErr } = await supabase.auth.getUser()\n' +
  '    if (userErr || !userRes.user) return NextResponse.json({ success: false, error: "User not authenticated" }, { status: 401 })\n' +
  '    const userId = userRes.user.id'
)

function walk(dir) {
  const ents = fs.readdirSync(dir, { withFileTypes: true })
  for (const ent of ents) {
    const full = path.join(dir, ent.name)
    if (ent.isDirectory()) walk(full)
    else if (ent.isFile() && ent.name === 'route.ts') processFile(full)
  }
}

function processFile(filePath) {
  let src = fs.readFileSync(filePath, 'utf8')
  const original = src

  if (!headerGetRegex.test(src)) {
    return // no x-user-id usage
  }

  // Replace header userId and guard
  src = src.replace(headerGetRegex, authBlock)

  // Remove immediate if (!userId) block following (best-effort)
  src = src.replace(ifNoUserRegex, (m) => {
    // If our injected auth block already contains proper checks, drop this block entirely
    return ''
  })

  // Ensure import exists
  if (!importSupabaseRegex.test(src)) {
    // Add import at top after first import line
    const lines = src.split('\n')
    const firstImportIndex = lines.findIndex(l => /^import\s+/.test(l))
    const importLine = "import { createSupabaseServer } from \"@/lib/supabase/server\""
    if (firstImportIndex >= 0) {
      lines.splice(firstImportIndex + 1, 0, importLine)
      src = lines.join('\n')
    } else {
      src = importLine + '\n' + src
    }
  }

  if (src !== original) {
    fs.writeFileSync(filePath, src, 'utf8')
    console.log(`[updated] ${path.relative(ROOT, filePath)}`)
  }
}

walk(API_DIR)
console.log('Done replacing x-user-id usage.')


