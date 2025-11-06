# Vercel Deployment Guide - Fixing Image Issues

## Problem
Article images stored in Supabase Storage are not showing up on the deployed Vercel site.

## Solution

### 1. Set Environment Variables in Vercel

Go to your Vercel project settings → Environment Variables and add:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE=your-service-role-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key (same as above)
```

**Important:** 
- These must be set for **Production**, **Preview**, and **Development** environments
- After adding variables, **redeploy** your application

### 2. Verify Storage Buckets Exist and Are Public

Run this in your Supabase SQL Editor:

```sql
-- Check if buckets exist
SELECT * FROM storage.buckets WHERE id IN ('news-images', 'news-videos', 'news-featured');

-- Check if buckets are public
SELECT id, name, public FROM storage.buckets WHERE id IN ('news-images', 'news-videos', 'news-featured');
```

If buckets don't exist or aren't public, run the migration:

```sql
-- Make sure buckets exist and are public
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('news-images', 'news-images', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']),
  ('news-videos', 'news-videos', true, 104857600, ARRAY['video/mp4', 'video/webm', 'video/quicktime', 'video/avi', 'video/mov']),
  ('news-featured', 'news-featured', true, 20971520, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE 
SET public = true;
```

### 3. Verify Storage Policies Allow Public Read Access

Ensure these policies exist in Supabase:

```sql
-- Public read access for news images
CREATE POLICY "News images are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'news-images')
ON CONFLICT DO NOTHING;

-- Public read access for news videos  
CREATE POLICY "News videos are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'news-videos')
ON CONFLICT DO NOTHING;

-- Public read access for news featured images
CREATE POLICY "News featured images are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'news-featured')
ON CONFLICT DO NOTHING;
```

### 4. Test Image URLs

After deployment, check if images are accessible:
1. Open browser DevTools → Network tab
2. Visit a page with article images
3. Check if image requests return 200 OK or 403 Forbidden
4. If 403, the storage policies need to be fixed
5. If 404, the image path might be incorrect

### 5. Quick Fix Script

If you have access to run scripts locally with Supabase credentials:

```bash
npm run setup-storage
```

This will create/verify all required storage buckets.

## Common Issues

### Images return 403 Forbidden
- **Cause**: Storage bucket is not public or RLS policies are blocking access
- **Fix**: Run the SQL above to ensure buckets are public and policies allow SELECT

### Images return 404 Not Found
- **Cause**: Image URLs are incorrect or files don't exist
- **Fix**: Check the `featured_image_url` in your database matches actual file paths in storage

### Environment variables not working
- **Cause**: Variables not set correctly or not redeployed
- **Fix**: 
  1. Double-check variable names (must be exact)
  2. Remove and re-add variables
  3. Trigger a new deployment after setting variables

## Verification

After fixing, verify:
1. ✅ Environment variables are set in Vercel
2. ✅ Storage buckets exist and are public
3. ✅ Storage policies allow public SELECT
4. ✅ Application has been redeployed
5. ✅ Images load in browser DevTools Network tab

