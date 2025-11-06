/**
 * Script to check and verify admin user role
 * 
 * Usage:
 *   node scripts/check-admin-role.js <email>
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

async function checkAdminRole(email) {
  try {
    console.log(`\n🔍 Checking admin role for: ${email}...\n`);

    // Get user from auth
    const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
    const authUser = authUsers?.users?.find(u => u.email === email);
    
    if (!authUser) {
      console.error('❌ User not found in auth.users');
      process.exit(1);
    }

    console.log(`✅ Found auth user: ${authUser.id}`);

    // Get user from public.users table
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, display_name, role')
      .eq('id', authUser.id)
      .single();

    if (userError) {
      console.error('❌ Error fetching user:', userError.message);
      process.exit(1);
    }

    if (!userData) {
      console.error('❌ User not found in public.users table');
      process.exit(1);
    }

    console.log('\n📊 Current User Data:');
    console.log(`   ID: ${userData.id}`);
    console.log(`   Email: ${userData.email}`);
    console.log(`   Display Name: ${userData.display_name}`);
    console.log(`   Role: ${userData.role}`);
    console.log(`   Role Type: ${typeof userData.role}`);

    if (userData.role === 'ADMIN' || userData.role === 'Admin') {
      console.log('\n✅ User has admin role!');
    } else {
      console.log('\n⚠️  User does NOT have admin role');
      console.log('\n🔧 Updating role to ADMIN...');
      
      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({ role: 'ADMIN' })
        .eq('id', authUser.id);

      if (updateError) {
        console.error('❌ Error updating role:', updateError.message);
        process.exit(1);
      }

      console.log('✅ Role updated to ADMIN');
      console.log('\n💡 Please log out and log back in to refresh your session.\n');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Get command line arguments
const args = process.argv.slice(2);

if (args.length < 1) {
  console.error('❌ Usage: node scripts/check-admin-role.js <email>');
  console.error('\nExample:');
  console.error('  node scripts/check-admin-role.js admin@example.com');
  process.exit(1);
}

const [email] = args;

if (!email) {
  console.error('❌ Error: Email is required');
  process.exit(1);
}

checkAdminRole(email);

