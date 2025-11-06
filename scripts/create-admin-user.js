/**
 * Script to create an admin user account
 * 
 * Usage:
 *   node scripts/create-admin-user.js <email> <password>
 * 
 * Example:
 *   node scripts/create-admin-user.js admin@example.com MySecurePassword123
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load .env.local file manually since dotenv might not be installed
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
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE are set in .env.local');
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createAdminUser(email, password) {
  try {
    console.log(`\n🔐 Creating admin user: ${email}...\n`);

    // Step 1: Create auth user
    console.log('Step 1: Creating auth user...');
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email for admin accounts
      user_metadata: {
        display_name: email.split('@')[0],
      }
    });

    if (authError) {
      // Check if user already exists
      if (authError.message.includes('already registered') || authError.message.includes('already exists')) {
        console.log('⚠️  User already exists in auth. Checking if admin role can be assigned...');
        
        // Try to get existing user
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser = existingUsers?.users?.find(u => u.email === email);
        
        if (!existingUser) {
          console.error('❌ Could not find existing user');
          process.exit(1);
        }
        
        const userId = existingUser.id;
        
        // Step 2: Update user role to ADMIN
        console.log('Step 2: Updating user role to ADMIN...');
        const { error: updateError } = await supabaseAdmin
          .from('users')
          .update({ role: 'ADMIN' })
          .eq('id', userId);

        if (updateError) {
          console.error('❌ Error updating user role:', updateError.message);
          
          // If user doesn't exist in users table, create it
          if (updateError.code === 'PGRST116' || updateError.message.includes('No rows')) {
            console.log('Step 2b: Creating user record in users table...');
            const { error: createError } = await supabaseAdmin
              .from('users')
              .insert({
                id: userId,
                email,
                display_name: email.split('@')[0],
                role: 'ADMIN',
                email_verified: true,
                auth_provider: 'email',
              });

            if (createError) {
              console.error('❌ Error creating user record:', createError.message);
              process.exit(1);
            }
          } else {
            process.exit(1);
          }
        } else {
          console.log('✅ User role updated to ADMIN');
        }
        
        console.log('\n✅ Admin account ready!');
        console.log(`   Email: ${email}`);
        console.log(`   User ID: ${userId}`);
        console.log('\n💡 You can now log in at: http://localhost:3000/login\n');
        return;
      }
      
      console.error('❌ Error creating auth user:', authError.message);
      process.exit(1);
    }

    if (!authData.user) {
      console.error('❌ No user data returned');
      process.exit(1);
    }

    const userId = authData.user.id;
    console.log(`✅ Auth user created: ${userId}`);

    // Step 2: Update user role to ADMIN
    console.log('Step 2: Setting user role to ADMIN...');
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ role: 'ADMIN' })
      .eq('id', userId);

    if (updateError) {
      // If user doesn't exist in users table yet, create it
      if (updateError.code === 'PGRST116' || updateError.message.includes('No rows')) {
        console.log('Step 2b: Creating user record in users table...');
        const { error: createError } = await supabaseAdmin
          .from('users')
          .insert({
            id: userId,
            email,
            display_name: email.split('@')[0],
            role: 'ADMIN',
            email_verified: true,
            auth_provider: 'email',
          });

        if (createError) {
          console.error('❌ Error creating user record:', createError.message);
          process.exit(1);
        }
        console.log('✅ User record created with ADMIN role');
      } else {
        console.error('❌ Error updating user role:', updateError.message);
        process.exit(1);
      }
    } else {
      console.log('✅ User role set to ADMIN');
    }

    console.log('\n✅ Admin account created successfully!');
    console.log(`   Email: ${email}`);
    console.log(`   User ID: ${userId}`);
    console.log('\n💡 You can now log in at: http://localhost:3000/login\n');

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Get command line arguments
const args = process.argv.slice(2);

if (args.length < 2) {
  console.error('❌ Usage: node scripts/create-admin-user.js <email> <password>');
  console.error('\nExample:');
  console.error('  node scripts/create-admin-user.js admin@example.com MySecurePassword123');
  process.exit(1);
}

const [email, password] = args;

if (!email || !password) {
  console.error('❌ Error: Email and password are required');
  process.exit(1);
}

if (password.length < 6) {
  console.error('❌ Error: Password must be at least 6 characters');
  process.exit(1);
}

createAdminUser(email, password);

