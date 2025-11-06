/**
 * Script to fix RLS policies for news_media table
 * Updates policies to accept both uppercase and title case roles
 * 
 * Usage:
 *   node scripts/fix-news-media-rls.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load .env.local file manually
function loadEnvFile() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^=:#]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^["']|["']$/g, '');
        process.env[key] = value;
      }
    });
  }
}

loadEnvFile();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
  console.error('❌ Error: Missing Supabase configuration');
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function fixRLSPolicies() {
  try {
    console.log('\n🔧 Fixing RLS policies for news_media table...\n');

    // Drop existing policies
    const policiesToDrop = [
      'Authenticated users can insert news media',
      'Users can update their own news media',
      'Users can delete their own news media'
    ];

    for (const policyName of policiesToDrop) {
      try {
        await supabaseAdmin.rpc('exec_sql', {
          sql: `DROP POLICY IF EXISTS "${policyName}" ON news_media;`
        });
        console.log(`✅ Dropped policy: ${policyName}`);
      } catch (error) {
        // Policy might not exist, continue
        console.log(`⚠️  Could not drop policy ${policyName}:`, error.message);
      }
    }

    // Create new policies that accept both uppercase and title case roles
    const sql = `
      -- Enable RLS if not already enabled
      ALTER TABLE news_media ENABLE ROW LEVEL SECURITY;

      -- Policy for inserting news media (accepts ADMIN, AUTHOR, Admin, Author)
      CREATE POLICY "Authenticated users can insert news media" ON news_media
        FOR INSERT WITH CHECK (
          auth.uid() IS NOT NULL AND
          EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND (u.role::text IN ('ADMIN', 'AUTHOR', 'Admin', 'Author') 
                 OR UPPER(u.role::text) IN ('ADMIN', 'AUTHOR'))
          )
        );

      -- Policy for updating news media
      CREATE POLICY "Users can update their own news media" ON news_media
        FOR UPDATE USING (
          auth.uid() IS NOT NULL AND
          EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND (u.role::text IN ('ADMIN', 'AUTHOR', 'Admin', 'Author') 
                 OR UPPER(u.role::text) IN ('ADMIN', 'AUTHOR'))
          )
        );

      -- Policy for deleting news media
      CREATE POLICY "Users can delete their own news media" ON news_media
        FOR DELETE USING (
          auth.uid() IS NOT NULL AND
          EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND (u.role::text IN ('ADMIN', 'AUTHOR', 'Admin', 'Author') 
                 OR UPPER(u.role::text) IN ('ADMIN', 'AUTHOR'))
          )
        );
    `;

    // Note: We can't directly execute SQL via Supabase JS client easily
    // We need to use the SQL Editor or CLI
    console.log('⚠️  Cannot execute SQL directly via script.');
    console.log('\n📋 Please run this SQL in your Supabase SQL Editor:');
    console.log('\n' + sql);
    console.log('\nOr use the Supabase CLI:');
    console.log('  npx supabase db push\n');

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

fixRLSPolicies();






