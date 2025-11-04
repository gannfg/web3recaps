import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServer } from "@/lib/supabase/server"
import { z } from "zod"

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createSupabaseServer()
    if (!supabase) {
      return NextResponse.json({ success: false, error: "Database not configured" }, { status: 500 })
    }

    const userId = params.id

    // First, check if user exists
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("id", userId)
      .single()

    if (userError || !user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })
    }

    // Delete user (this will cascade to related records due to foreign key constraints)
    const { error: deleteError } = await supabase
      .from("users")
      .delete()
      .eq("id", userId)

    if (deleteError) {
      console.error("Error deleting user:", deleteError)
      return NextResponse.json({ success: false, error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "User deleted successfully"
    })

  } catch (error) {
    console.error("Error in DELETE /api/admin/users/[id]:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

// Admin: suspend/unsuspend user
const suspendSchema = z.object({
  isSuspended: z.boolean(),
  reason: z.string().optional().default(""),
  until: z.string().datetime().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createSupabaseServer()
    if (!supabase) {
      return NextResponse.json({ success: false, error: "Database not configured" }, { status: 500 })
    }

    const userId = params.id
    const body = await request.json().catch(() => ({}))
    const parsed = suspendSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid payload" }, { status: 400 })
    }

    const { isSuspended, reason, until } = parsed.data

    const { error } = await supabase
      .from("users")
      .update({
        is_suspended: isSuspended,
        suspension_reason: isSuspended ? (reason || null) : null,
        suspended_until: isSuspended ? (until || null) : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId)

    if (error) {
      console.error("Error updating suspension:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
