import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServer, createSupabaseAdmin } from "@/lib/supabase/server"
import { requireUser } from "@/lib/auth"

const ACCESS_COOKIE = "sb-access-token"
const REFRESH_COOKIE = "sb-refresh-token"

async function getAuthedClient(request: NextRequest) {
  const auth = await requireUser(request)
  if (!auth.supabase || !auth.user) return { supabase: null, user: null }
  return { supabase: auth.supabase, user: auth.user }
}

const BUCKET_CONFIGS = {
  'team-avatars': { maxSize: 5 * 1024 * 1024, allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] },
  'team-banners': { maxSize: 10 * 1024 * 1024, allowedTypes: ['image/jpeg', 'image/png', 'image/webp'] },
  'project-banners': { maxSize: 10 * 1024 * 1024, allowedTypes: ['image/jpeg', 'image/png', 'image/webp'] },
  'project-logos': { maxSize: 5 * 1024 * 1024, allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'] },
  'project-screenshots': { maxSize: 10 * 1024 * 1024, allowedTypes: ['image/jpeg', 'image/png', 'image/webp'] },
  'project-videos': { maxSize: 100 * 1024 * 1024, allowedTypes: ['video/mp4', 'video/webm', 'video/quicktime'] },
  'avatars': { maxSize: 5 * 1024 * 1024, allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] },
  'post-images': { maxSize: 10 * 1024 * 1024, allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] },
  'post-videos': { maxSize: 50 * 1024 * 1024, allowedTypes: ['video/mp4', 'video/webm', 'video/quicktime', 'video/avi'] },
  'event-images': { maxSize: 25 * 1024 * 1024, allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] },
  'magazine-images': { maxSize: 25 * 1024 * 1024, allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] },
  'kyc-documents': { maxSize: 10 * 1024 * 1024, allowedTypes: ['image/jpeg', 'image/png', 'application/pdf'] }
}

function generateUniqueFilename(originalName: string, entityId: string): string {
  const timestamp = Date.now()
  const extension = originalName.split('.').pop()
  const baseName = originalName.split('.').slice(0, -1).join('.')
  return `${entityId}/${baseName}_${timestamp}.${extension}`
}

function validateFile(file: File, bucket: string): { valid: boolean; error?: string } {
  const config = BUCKET_CONFIGS[bucket as keyof typeof BUCKET_CONFIGS]
  
  if (!config) {
    return { valid: false, error: 'Invalid bucket' }
  }
  
  if (file.size > config.maxSize) {
    return { valid: false, error: `File size exceeds ${config.maxSize / (1024 * 1024)}MB limit` }
  }
  
  if (!config.allowedTypes.includes(file.type)) {
    return { valid: false, error: `File type ${file.type} not allowed` }
  }
  
  return { valid: true }
}

// POST /api/upload - Upload files to storage buckets
export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await getAuthedClient(request)
    if (!supabase || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const bucket = formData.get('bucket') as string
    const entityId = formData.get('entityId') as string // team ID, project ID, or user ID
    const entityType = formData.get('entityType') as string // 'team', 'project', 'user', 'post'

    if (!file || !bucket) {
      return NextResponse.json({ 
        success: false,
        error: "Missing required fields: file, bucket" 
      }, { status: 400 })
    }

    // For post, event, and magazine uploads, we don't need entityId and entityType
    if (!['post-images', 'post-videos', 'event-images', 'magazine-images'].includes(bucket)) {
      if (!entityId || !entityType) {
        return NextResponse.json({ 
          success: false,
          error: "Missing required fields: entityId, entityType" 
        }, { status: 400 })
      }
    }

    // Validate file
    const validation = validateFile(file, bucket)
    if (!validation.valid) {
      return NextResponse.json({ success: false, error: validation.error }, { status: 400 })
    }

    // Check permissions based on entity type
    let hasPermission = false

    if (['post-images', 'post-videos', 'event-images', 'magazine-images'].includes(bucket)) {
      // Any authenticated user can upload post, event, and magazine media
      hasPermission = true
    } else if (bucket === 'kyc-documents') {
      // Users can only upload their own KYC documents
      hasPermission = entityType === 'user' && entityId === user.id
    } else if (entityType === 'user') {
      // Users can only upload their own avatars
      hasPermission = entityId === user.id
    } else if (entityType === 'team') {
      // Check if user is team leader or co-leader
      const { data: membership } = await supabase
        .from('team_members')
        .select('role')
        .eq('team_id', entityId)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single()

      const { data: team } = await supabase
        .from('teams')
        .select('created_by')
        .eq('id', entityId)
        .single()

      hasPermission = !!(team?.created_by === user.id || 
        (membership && ['leader', 'co_leader'].includes(membership.role)))

      console.log("Team avatar upload permission check:", {
        entityId,
        userId: user.id,
        teamCreatedBy: team?.created_by,
        membershipRole: membership?.role,
        hasPermission
      })
    } else if (entityType === 'project') {
      // Check if user is project creator, contributor, or team member
      const { data: project } = await supabase
        .from('projects')
        .select('created_by, team_id')
        .eq('id', entityId)
        .single()

      if (!project) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 })
      }

      if (project.created_by === user.id) {
        hasPermission = true
      } else {
        // Check if user is contributor
        const { data: contributor } = await supabase
          .from('project_contributors')
          .select('role')
          .eq('project_id', entityId)
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single()

        if (contributor) {
          hasPermission = true
        } else if (project.team_id) {
          // Check if user is team member
          const { data: teamMember } = await supabase
            .from('team_members')
            .select('role')
            .eq('team_id', project.team_id)
            .eq('user_id', user.id)
            .eq('is_active', true)
            .single()

          hasPermission = !!(teamMember && ['leader', 'co_leader', 'pm'].includes(teamMember.role))
        }
      }
    }

    if (!hasPermission) {
      return NextResponse.json({ success: false, error: "Insufficient permissions" }, { status: 403 })
    }

    // Generate unique filename
    const fileName = ['post-images', 'post-videos', 'event-images', 'magazine-images'].includes(bucket) 
      ? generateUniqueFilename(file.name, user.id)
      : generateUniqueFilename(file.name, entityId)

    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer()
    const fileBuffer = new Uint8Array(arrayBuffer)

    // Upload to Supabase Storage
    console.log("Attempting upload to bucket:", bucket, "with fileName:", fileName)
    
    // For event images, avatars, and post media, use admin client to bypass RLS policies if needed
    let uploadClient = supabase
    if (bucket === 'event-images' || bucket === 'avatars' || bucket === 'post-images' || bucket === 'post-videos') {
      const adminClient = createSupabaseAdmin()
      if (adminClient) {
        uploadClient = adminClient
        console.log(`Using admin client for ${bucket}`)
      } else {
        console.warn(`Admin client not available for ${bucket} - using regular client`)
      }
    }
    
    const { data: uploadData, error: uploadError } = await uploadClient.storage
      .from(bucket)
      .upload(fileName, fileBuffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: true // Allow overwriting existing files
      })

    if (uploadError) {
      console.error("Upload error:", uploadError)
      console.error("Upload error details:", {
        message: uploadError.message,
        statusCode: (uploadError as any).statusCode,
        error: (uploadError as any).error
      })
      return NextResponse.json({ 
        success: false,
        error: uploadError.message 
      }, { status: 400 })
    }

    console.log("Upload data received:", uploadData)

    // Get public URL - use the path from uploadData, not fileName
    const filePath = uploadData.path || fileName
    const { data: { publicUrl } } = uploadClient.storage
      .from(bucket)
      .getPublicUrl(filePath)

    console.log("Upload successful:", {
      bucket,
      fileName,
      uploadPath: uploadData.path,
      publicUrl
    })

    const res = NextResponse.json({
      success: true,
      data: {
        fileName: uploadData.path,
        publicUrl,
        size: file.size,
        type: file.type
      }
    })
    const origin = request.headers.get('origin') || ''
    const allowed = ['https://web3recap.io', 'http://localhost:3000']
    if (allowed.includes(origin)) {
      res.headers.set('Access-Control-Allow-Origin', origin)
      res.headers.set('Vary', 'Origin')
      res.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
      res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    }
    return res

  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    )
  }
}

// OPTIONS /api/upload - Handle CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin') || ''
  const allowed = ['https://web3recap.io', 'http://localhost:3000']
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }
  if (allowed.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin
    headers['Vary'] = 'Origin'
  }
  return new NextResponse(null, { status: 200, headers })
}

// DELETE /api/upload - Delete files from storage buckets
export async function DELETE(request: NextRequest) {
  try {
    const { supabase, user } = await getAuthedClient(request)
    if (!supabase || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const bucket = searchParams.get('bucket')
    const fileName = searchParams.get('fileName')
    const entityId = searchParams.get('entityId')
    const entityType = searchParams.get('entityType')

    if (!bucket || !fileName || !entityId || !entityType) {
      return NextResponse.json({ 
        error: "Missing required parameters: bucket, fileName, entityId, entityType" 
      }, { status: 400 })
    }

    // Check permissions (similar to upload)
    let hasPermission = false

    if (entityType === 'user') {
      hasPermission = entityId === user.id
    } else if (entityType === 'team') {
      const { data: membership } = await supabase
        .from('team_members')
        .select('role')
        .eq('team_id', entityId)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single()

      const { data: team } = await supabase
        .from('teams')
        .select('created_by')
        .eq('id', entityId)
        .single()

      hasPermission = !!(team?.created_by === user.id || 
        (membership && ['leader', 'co_leader'].includes(membership.role)))
    } else if (entityType === 'project') {
      const { data: project } = await supabase
        .from('projects')
        .select('created_by, team_id')
        .eq('id', entityId)
        .single()

      if (!project) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 })
      }

      if (project.created_by === user.id) {
        hasPermission = true
      } else {
        const { data: contributor } = await supabase
          .from('project_contributors')
          .select('role')
          .eq('project_id', entityId)
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single()

        if (contributor) {
          hasPermission = true
        } else if (project.team_id) {
          const { data: teamMember } = await supabase
            .from('team_members')
            .select('role')
            .eq('team_id', project.team_id)
            .eq('user_id', user.id)
            .eq('is_active', true)
            .single()

          hasPermission = !!(teamMember && ['leader', 'co_leader', 'pm'].includes(teamMember.role))
        }
      }
    }

    if (!hasPermission) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }

    // Delete file from storage
    const { error: deleteError } = await supabase.storage
      .from(bucket)
      .remove([fileName])

    if (deleteError) {
      console.error("Delete error:", deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      data: { message: "File deleted successfully" }
    })

  } catch (error) {
    console.error("Delete error:", error)
    return NextResponse.json(
      { error: "Failed to delete file" },
      { status: 500 }
    )
  }
}
