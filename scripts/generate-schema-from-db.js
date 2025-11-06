const fs = require('fs')
const path = require('path')

const DB_DUMP_PATH = path.join(__dirname, '..', 'db.txt')
const OUTPUT_PATH = path.join(__dirname, '..', 'supabase-schema.sql')

const dump = fs.readFileSync(DB_DUMP_PATH, 'utf8')

const tableRegex = /CREATE TABLE public\.(\w+)\s*\(([\s\S]*?)\);/g

const tables = new Map()
const foreignKeys = []
let match
while ((match = tableRegex.exec(dump)) !== null) {
  const name = match[1]
  let body = match[2]

  const lines = body.split('\n')
  const keptLines = []

  lines.forEach((line) => {
    const trimmed = line.trim()
    if (/^CONSTRAINT\s+.+FOREIGN KEY/i.test(trimmed)) {
      const constraint = trimmed.replace(/,+$/, '')
      foreignKeys.push(`ALTER TABLE public.${name} ADD ${constraint};`)
    } else {
      if (trimmed.includes('USER-DEFINED')) {
        if (trimmed.includes('badge_rarity')) {
          line = line.replace('USER-DEFINED', 'public.badge_rarity')
        } else if (trimmed.includes('user_role')) {
          line = line.replace('USER-DEFINED', 'public.user_role')
        }
      }

      if (/^\s*\w+\s+ARRAY\b/i.test(line)) {
        line = line.replace(/ARRAY\b/i, 'text[]')
      }
      keptLines.push(line)
    }
  })

  for (let i = keptLines.length - 1; i >= 0; i--) {
    const current = keptLines[i]
    if (!current.trim()) continue
    keptLines[i] = current.replace(/,+\s*$/, '')
    break
  }

  body = keptLines.join('\n')

  const statement = `CREATE TABLE public.${name} (\n${body}\n);`

  const references = Array.from(new Set(Array.from(body.matchAll(/REFERENCES public\.(\w+)/g)).map((m) => m[1]).filter((ref) => ref !== name)))

  tables.set(name, {
    name,
    statement,
    dependencies: references
  })
}

const sorted = []
const visited = new Map()

function visit(name, stack = new Set()) {
  if (!tables.has(name)) return
  const state = visited.get(name)
  if (state === 'permanent') return
  if (state === 'temporary') {
    throw new Error(`Circular dependency detected involving table: ${name}`)
  }

  visited.set(name, 'temporary')
  stack.add(name)

  const table = tables.get(name)
  table.dependencies.filter((dep) => tables.has(dep)).forEach((dep) => visit(dep, stack))

  visited.set(name, 'permanent')
  stack.delete(name)
  sorted.push(table)
}

Array.from(tables.keys()).forEach((name) => {
  if (!visited.has(name)) {
    visit(name)
  }
})

const header = `-- Auto-generated schema based on db.txt\n-- Generated at ${new Date().toISOString()}\n\nBEGIN;\n\nCREATE EXTENSION IF NOT EXISTS "pgcrypto";\nCREATE EXTENSION IF NOT EXISTS "uuid-ossp";\n\nDO $$ BEGIN\n  CREATE TYPE public.badge_rarity AS ENUM ('common','uncommon','rare','epic','legendary');\nEXCEPTION WHEN duplicate_object THEN NULL;\nEND $$;\n\nDO $$ BEGIN\n  CREATE TYPE public.user_role AS ENUM ('VISITOR','STUDENT','BUILDER','AUTHOR','ADMIN');\nEXCEPTION WHEN duplicate_object THEN NULL;\nEND $$;\n`

const body = sorted
  .map((table) => table.statement.replace(/\n\n+/g, '\n'))
  .join('\n\n')

const fkSection = foreignKeys.length ? `\n\n-- Deferred foreign key constraints\n${foreignKeys.join('\n')}` : ''

const footer = '\n\nCOMMIT;\n'

fs.writeFileSync(OUTPUT_PATH, `${header}\n${body}${fkSection}${footer}`)

console.log(`Schema written to ${OUTPUT_PATH}`)

