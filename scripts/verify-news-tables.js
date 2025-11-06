/**
 * Script to verify and create news_articles table in Supabase if it doesn't exist
 * 
 * Usage:
 *   node scripts/verify-news-tables.js
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
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE are set in .env.local');
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkTableExists(tableName) {
  try {
    // Try to query the table with a limit of 0 to check if it exists
    const { error } = await supabaseAdmin
      .from(tableName)
      .select('*')
      .limit(0);
    
    if (error) {
      // Check if it's a "relation does not exist" error
      if (error.code === '42P01' || error.message.includes('does not exist')) {
        return false;
      }
      // Other errors might mean table exists but has issues
      console.warn(`⚠️  Warning checking ${tableName}:`, error.message);
      return true; // Assume it exists if we can't determine
    }
    return true;
  } catch (error) {
    console.error(`Error checking ${tableName}:`, error.message);
    return false;
  }
}

async function createNewsCategories() {
  console.log('\n📝 Creating news_categories table...');
  
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS public.news_categories (
      id uuid NOT NULL DEFAULT gen_random_uuid(),
      name character varying NOT NULL UNIQUE,
      slug character varying NOT NULL UNIQUE,
      description text,
      color character varying DEFAULT '#3B82F6'::character varying,
      icon character varying,
      is_active boolean DEFAULT true,
      sort_order integer DEFAULT 0,
      subscriber_count integer DEFAULT 0,
      article_count integer DEFAULT 0,
      created_at timestamp with time zone DEFAULT now(),
      CONSTRAINT news_categories_pkey PRIMARY KEY (id)
    );
    
    CREATE INDEX IF NOT EXISTS news_categories_slug_idx ON public.news_categories(slug);
    CREATE INDEX IF NOT EXISTS news_categories_is_active_idx ON public.news_categories(is_active);
  `;

  const { error } = await supabaseAdmin.rpc('exec_sql', { sql: createTableSQL });
  
  if (error) {
    // Try direct SQL execution via REST API
    console.log('Trying alternative method...');
    // For now, we'll just report that it needs to be created manually
    return false;
  }
  
  return true;
}

async function createNewsArticles() {
  console.log('\n📝 Creating news_articles table...');
  
  // First check if news_categories exists
  const categoriesExist = await checkTableExists('news_categories');
  if (!categoriesExist) {
    console.log('⚠️  news_categories table does not exist. Creating it first...');
    await createNewsCategories();
  }

  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS public.news_articles (
      id uuid NOT NULL DEFAULT gen_random_uuid(),
      title character varying NOT NULL,
      slug character varying NOT NULL UNIQUE,
      excerpt text,
      content text NOT NULL,
      featured_image_url text,
      featured_image_alt text,
      author_id uuid,
      author_name character varying NOT NULL,
      author_email character varying,
      author_bio text,
      author_avatar_url text,
      author_twitter character varying,
      author_linkedin character varying,
      subcategory character varying,
      tags text[] DEFAULT '{}'::text[],
      source_type character varying NOT NULL DEFAULT 'internal'::character varying,
      external_url text,
      external_source character varying,
      status character varying NOT NULL DEFAULT 'draft'::character varying,
      published_at timestamp with time zone,
      scheduled_at timestamp with time zone,
      updated_at timestamp with time zone DEFAULT now(),
      meta_title character varying,
      meta_description character varying,
      meta_keywords text[],
      canonical_url text,
      og_title character varying,
      og_description character varying,
      og_image_url text,
      twitter_title character varying,
      twitter_description character varying,
      twitter_image_url text,
      reading_time integer,
      word_count integer,
      view_count integer DEFAULT 0,
      unique_view_count integer DEFAULT 0,
      like_count integer DEFAULT 0,
      comment_count integer DEFAULT 0,
      share_count integer DEFAULT 0,
      bookmark_count integer DEFAULT 0,
      engagement_score numeric DEFAULT 0,
      time_on_page numeric DEFAULT 0,
      bounce_rate numeric DEFAULT 0,
      scroll_depth numeric DEFAULT 0,
      is_featured boolean DEFAULT false,
      is_breaking boolean DEFAULT false,
      is_trending boolean DEFAULT false,
      is_editor_pick boolean DEFAULT false,
      priority integer DEFAULT 0,
      editor_notes text,
      content_type character varying DEFAULT 'article'::character varying,
      language character varying DEFAULT 'en'::character varying,
      reading_level character varying DEFAULT 'intermediate'::character varying,
      allow_comments boolean DEFAULT true,
      allow_sharing boolean DEFAULT true,
      allow_bookmarking boolean DEFAULT true,
      created_at timestamp with time zone DEFAULT now(),
      category_id uuid NOT NULL,
      layout_position character varying,
      CONSTRAINT news_articles_pkey PRIMARY KEY (id),
      CONSTRAINT news_articles_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(id) ON DELETE SET NULL,
      CONSTRAINT news_articles_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.news_categories(id)
    );
    
    CREATE INDEX IF NOT EXISTS news_articles_slug_idx ON public.news_articles(slug);
    CREATE INDEX IF NOT EXISTS news_articles_status_idx ON public.news_articles(status);
    CREATE INDEX IF NOT EXISTS news_articles_category_id_idx ON public.news_articles(category_id);
    CREATE INDEX IF NOT EXISTS news_articles_published_at_idx ON public.news_articles(published_at);
    CREATE INDEX IF NOT EXISTS news_articles_is_featured_idx ON public.news_articles(is_featured);
    CREATE INDEX IF NOT EXISTS news_articles_is_breaking_idx ON public.news_articles(is_breaking);
  `;

  // Note: We can't directly execute SQL via Supabase JS client
  // We need to use the Supabase CLI or SQL editor
  console.log('⚠️  Cannot create tables directly via script.');
  console.log('📋 Please run the SQL schema in your Supabase SQL Editor.');
  console.log('\nThe SQL is available in: supabase-schema.sql');
  console.log('\nOr use the Supabase CLI:');
  console.log('  npx supabase db push');
  
  return false;
}

async function verifyTables() {
  try {
    console.log('\n🔍 Checking news tables in Supabase...\n');

    const tables = [
      'news_categories',
      'news_articles',
      'news_article_comments',
      'news_article_reactions',
      'news_article_bookmarks',
      'news_article_views',
      'news_article_shares'
    ];

    const results = {};
    
    for (const table of tables) {
      const exists = await checkTableExists(table);
      results[table] = exists;
      console.log(`${exists ? '✅' : '❌'} ${table}: ${exists ? 'EXISTS' : 'MISSING'}`);
    }

    const missingTables = Object.entries(results).filter(([_, exists]) => !exists);
    
    if (missingTables.length === 0) {
      console.log('\n✅ All news tables exist!');
      
      // Check if there are any categories
      const { data: categories, error: catError } = await supabaseAdmin
        .from('news_categories')
        .select('id, name, slug')
        .limit(5);
      
      if (catError) {
        console.log('\n⚠️  Error checking categories:', catError.message);
      } else {
        console.log(`\n📊 Found ${categories?.length || 0} categories`);
        if (categories && categories.length > 0) {
          console.log('   Categories:');
          categories.forEach(cat => {
            console.log(`     - ${cat.name} (${cat.slug})`);
          });
        } else {
          console.log('   ⚠️  No categories found. Creating default categories...');
          await createDefaultCategories();
        }
      }

      // Check if there are any articles
      const { data: articles, error: artError } = await supabaseAdmin
        .from('news_articles')
        .select('id, title, status')
        .limit(5);
      
      if (artError) {
        console.log('\n⚠️  Error checking articles:', artError.message);
      } else {
        console.log(`\n📊 Found ${articles?.length || 0} articles`);
        if (articles && articles.length > 0) {
          console.log('   Recent articles:');
          articles.forEach(art => {
            console.log(`     - ${art.title} (${art.status})`);
          });
        }
      }
      
    } else {
      console.log(`\n⚠️  Missing ${missingTables.length} table(s):`);
      missingTables.forEach(([table]) => {
        console.log(`   - ${table}`);
      });
      console.log('\n📝 To create the missing tables, please:');
      console.log('   1. Open Supabase Dashboard → SQL Editor');
      console.log('   2. Run the SQL from: supabase-schema.sql');
      console.log('   3. Or use: npx supabase db push');
    }

    console.log('\n');

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

async function createDefaultCategories() {
  const defaultCategories = [
    { name: 'Blockchain', slug: 'blockchain', description: 'Blockchain technology and infrastructure', color: '#3B82F6', sort_order: 1 },
    { name: 'DeFi', slug: 'defi', description: 'Decentralized Finance', color: '#10B981', sort_order: 2 },
    { name: 'NFT', slug: 'nft', description: 'Non-Fungible Tokens', color: '#8B5CF6', sort_order: 3 },
    { name: 'Web3', slug: 'web3', description: 'Web3 ecosystem and applications', color: '#F59E0B', sort_order: 4 },
    { name: 'Crypto', slug: 'crypto', description: 'Cryptocurrency news and updates', color: '#EF4444', sort_order: 5 },
  ];

  for (const category of defaultCategories) {
    const { error } = await supabaseAdmin
      .from('news_categories')
      .upsert(category, { onConflict: 'slug' });

    if (error) {
      console.log(`   ⚠️  Error creating category ${category.name}:`, error.message);
    } else {
      console.log(`   ✅ Created category: ${category.name}`);
    }
  }
}

verifyTables();

