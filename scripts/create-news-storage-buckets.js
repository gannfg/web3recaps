/**
 * Script to create news storage buckets in Supabase
 * 
 * Usage:
 *   node scripts/create-news-storage-buckets.js
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

async function createBucket(bucketConfig) {
  try {
    // Check if bucket exists
    const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
    
    if (listError) {
      console.error('❌ Error listing buckets:', listError.message);
      return false;
    }

    const existingBucket = buckets?.find(b => b.id === bucketConfig.id);
    
    if (existingBucket) {
      console.log(`✅ Bucket "${bucketConfig.id}" already exists`);
      return true;
    }

    // Create bucket
    const bucketOptions = {
      public: bucketConfig.public,
    };
    
    // Only add fileSizeLimit if it's provided and reasonable
    if (bucketConfig.fileSizeLimit && bucketConfig.fileSizeLimit <= 50 * 1024 * 1024) {
      bucketOptions.fileSizeLimit = bucketConfig.fileSizeLimit;
    }
    
    // Only add allowedMimeTypes if provided
    if (bucketConfig.allowedMimeTypes && bucketConfig.allowedMimeTypes.length > 0) {
      bucketOptions.allowedMimeTypes = bucketConfig.allowedMimeTypes;
    }
    
    const { data, error } = await supabaseAdmin.storage.createBucket(bucketConfig.id, bucketOptions);

    if (error) {
      console.error(`❌ Error creating bucket "${bucketConfig.id}":`, error.message);
      return false;
    }

    console.log(`✅ Created bucket "${bucketConfig.id}"`);
    return true;
  } catch (error) {
    console.error(`❌ Unexpected error creating bucket "${bucketConfig.id}":`, error.message);
    return false;
  }
}

async function setupBuckets() {
  try {
    console.log('\n📦 Setting up news storage buckets...\n');

    const buckets = [
      {
        id: 'news-images',
        public: true,
        fileSizeLimit: 10 * 1024 * 1024, // 10MB
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
      },
      {
        id: 'news-featured',
        public: true,
        fileSizeLimit: 20 * 1024 * 1024, // 20MB
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp']
      },
      {
        id: 'news-videos',
        public: true,
        // No fileSizeLimit - let Supabase use default (usually 50MB)
        allowedMimeTypes: ['video/mp4', 'video/webm', 'video/quicktime', 'video/avi', 'video/mov']
      }
    ];

    const results = await Promise.all(buckets.map(bucket => createBucket(bucket)));

    const allSuccess = results.every(r => r === true);
    
    if (allSuccess) {
      console.log('\n✅ All news storage buckets are ready!');
      console.log('\n💡 You can now upload images in the news editor.\n');
    } else {
      console.log('\n⚠️  Some buckets could not be created.');
      console.log('💡 Please create them manually in Supabase Dashboard → Storage\n');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

setupBuckets();

