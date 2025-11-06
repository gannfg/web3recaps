import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer, createSupabaseAdmin } from '@/lib/supabase/server';

const ACCESS_COOKIE = "sb-access-token"
const REFRESH_COOKIE = "sb-refresh-token"

async function getAuthedClient(request: NextRequest) {
  const access = request.cookies.get(ACCESS_COOKIE)?.value
  const refresh = request.cookies.get(REFRESH_COOKIE)?.value
  const supabase = createSupabaseServer()
  if (!supabase || !access || !refresh) return { supabase: null, user: null }
  
  await supabase.auth.setSession({ access_token: access, refresh_token: refresh })
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return { supabase: null, user: null }
  
  return { supabase, user }
}

// POST /api/news/upload - Upload media files for news articles
export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await getAuthedClient(request)
    if (!supabase || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    // Check if user has permission to upload media
    const { data: userRole } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    // Check for both uppercase and title case roles
    const allowedRoles = ['ADMIN', 'AUTHOR', 'Admin', 'Author'];
    const userRoleValue = userRole?.role?.toUpperCase();
    
    if (!userRole || !allowedRoles.some(role => role.toUpperCase() === userRoleValue)) {
      return NextResponse.json({ 
        success: false, 
        error: "Insufficient permissions to upload media" 
      }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const articleId = formData.get('articleId') as string;
    const mediaType = formData.get('mediaType') as string || 'image';
    const altText = formData.get('altText') as string || '';
    const caption = formData.get('caption') as string || '';
    const isFeatured = formData.get('isFeatured') === 'true';

    if (!file) {
      return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 });
    }

    // Validate file type and size
    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
    const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/avi', 'video/mov'];
    
    let bucket = '';
    let maxSize = 0;
    
    if (mediaType === 'image') {
      if (!allowedImageTypes.includes(file.type)) {
        return NextResponse.json({ 
          success: false, 
          error: "Invalid image format. Allowed: JPEG, PNG, WebP, GIF, SVG" 
        }, { status: 400 });
      }
      bucket = isFeatured ? 'news-featured' : 'news-images';
      maxSize = isFeatured ? 20 * 1024 * 1024 : 10 * 1024 * 1024; // 20MB for featured, 10MB for regular
    } else if (mediaType === 'video') {
      if (!allowedVideoTypes.includes(file.type)) {
        return NextResponse.json({ 
          success: false, 
          error: "Invalid video format. Allowed: MP4, WebM, QuickTime, AVI, MOV" 
        }, { status: 400 });
      }
      bucket = 'news-videos';
      maxSize = 100 * 1024 * 1024; // 100MB
    } else {
      return NextResponse.json({ 
        success: false, 
        error: "Invalid media type. Must be 'image' or 'video'" 
      }, { status: 400 });
    }

    if (file.size > maxSize) {
      return NextResponse.json({ 
        success: false, 
        error: `File too large. Max size: ${maxSize / (1024 * 1024)}MB` 
      }, { status: 400 });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = file.name.split('.').pop();
    const fileName = `${user.id}/${timestamp}-${randomString}.${fileExtension}`;

    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = new Uint8Array(arrayBuffer);

    // Use admin client for storage upload to bypass RLS
    // (We've already verified the user has permission via role check above)
    const supabaseAdmin = createSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json({ 
        success: false, 
        error: "Server configuration error" 
      }, { status: 500 });
    }

    // Upload to Supabase Storage using admin client
    console.log("Uploading to bucket:", bucket, "with fileName:", fileName);
    
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from(bucket)
      .upload(fileName, fileBuffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      
      // Provide helpful error message if bucket doesn't exist
      if (uploadError.message?.includes('Bucket not found') || uploadError.message?.includes('not found')) {
        return NextResponse.json({ 
          success: false, 
          error: `Storage bucket "${bucket}" not found. Please run "npm run setup-storage" to create the required buckets.` 
        }, { status: 400 });
      }
      
      return NextResponse.json({ 
        success: false, 
        error: `Upload failed: ${uploadError.message}` 
      }, { status: 400 });
    }

    // Get public URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from(bucket)
      .getPublicUrl(fileName);

    // Save media metadata to database using admin client to bypass RLS
    // (We've already verified the user has permission via role check above)
    const { data: mediaRecord, error: dbError } = await supabaseAdmin
      .from('news_media')
      .insert({
        article_id: articleId || null,
        media_type: mediaType,
        file_url: publicUrl,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        alt_text: altText,
        caption: caption,
        is_featured: isFeatured,
        sort_order: 0
      })
      .select()
      .single();

    if (dbError) {
      console.error("Database error:", dbError);
      // Clean up uploaded file if database insert fails
      await supabaseAdmin.storage.from(bucket).remove([fileName]);
      return NextResponse.json({ 
        success: false, 
        error: "Failed to save media metadata" 
      }, { status: 500 });
    }

    console.log("Upload successful:", {
      bucket,
      fileName,
      uploadPath: uploadData.path,
      publicUrl,
      mediaId: mediaRecord.id
    });

    return NextResponse.json({
      success: true,
      data: {
        id: mediaRecord.id,
        fileName: uploadData.path,
        publicUrl,
        size: file.size,
        type: file.type,
        mediaType,
        altText,
        caption,
        isFeatured
      }
    });

  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to upload file" },
      { status: 500 }
    );
  }
}

// GET /api/news/upload - Get media files for an article
export async function GET(request: NextRequest) {
  try {
    const { supabase, user } = await getAuthedClient(request)
    if (!supabase || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url);
    const articleId = searchParams.get('articleId');

    if (!articleId) {
      return NextResponse.json({ success: false, error: "Article ID is required" }, { status: 400 });
    }

    // Get media files for the article
    const { data: mediaFiles, error } = await supabase
      .from('news_media')
      .select('*')
      .eq('article_id', articleId)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json({ success: false, error: "Failed to fetch media files" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        mediaFiles: mediaFiles || []
      }
    });

  } catch (error) {
    console.error("Fetch error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch media files" },
      { status: 500 }
    );
  }
}

// DELETE /api/news/upload - Delete a media file
export async function DELETE(request: NextRequest) {
  try {
    const { supabase, user } = await getAuthedClient(request)
    if (!supabase || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url);
    const mediaId = searchParams.get('mediaId');

    if (!mediaId) {
      return NextResponse.json({ success: false, error: "Media ID is required" }, { status: 400 });
    }

    // Get media record to find the file path
    const { data: mediaRecord, error: fetchError } = await supabase
      .from('news_media')
      .select('*')
      .eq('id', mediaId)
      .single();

    if (fetchError || !mediaRecord) {
      return NextResponse.json({ success: false, error: "Media not found" }, { status: 404 });
    }

    // Determine bucket from file URL
    let bucket = '';
    if (mediaRecord.file_url.includes('/news-featured/')) {
      bucket = 'news-featured';
    } else if (mediaRecord.file_url.includes('/news-videos/')) {
      bucket = 'news-videos';
    } else if (mediaRecord.file_url.includes('/news-images/')) {
      bucket = 'news-images';
    } else {
      return NextResponse.json({ success: false, error: "Unknown storage bucket" }, { status: 400 });
    }

    // Extract file path from URL
    const urlParts = mediaRecord.file_url.split('/');
    const fileName = urlParts[urlParts.length - 2] + '/' + urlParts[urlParts.length - 1];

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from(bucket)
      .remove([fileName]);

    if (storageError) {
      console.error("Storage deletion error:", storageError);
      // Continue with database deletion even if storage deletion fails
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from('news_media')
      .delete()
      .eq('id', mediaId);

    if (dbError) {
      console.error("Database deletion error:", dbError);
      return NextResponse.json({ success: false, error: "Failed to delete media record" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Media file deleted successfully"
    });

  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete media file" },
      { status: 500 }
    );
  }
}