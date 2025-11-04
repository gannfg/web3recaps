import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServer } from "@/lib/supabase/server"
import { z } from "zod"

const updateRoleSchema = z.object({
  role: z.enum(["Visitor", "Student", "Builder", "Author", "Admin"])
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
    const body = await request.json()
    const { role } = updateRoleSchema.parse(body)

    // Map Title Case to enum uppercase for DB (typed)
    const ROLE_MAP = {
      Visitor: 'VISITOR',
      Student: 'STUDENT',
      Builder: 'BUILDER',
      Author: 'AUTHOR',
      Admin: 'ADMIN',
    } as const
    type TitleRole = keyof typeof ROLE_MAP
    const toEnum = (r: string) => ROLE_MAP[(r as TitleRole)] ?? 'VISITOR'

    // Update user role
    const { error } = await supabase
      .from("users")
      .update({ role: toEnum(role) })
      .eq("id", userId)

    if (error) {
      console.error("Error updating user role:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "User role updated successfully"
    })

  } catch (error) {
    console.error("Error in PATCH /api/admin/users/[id]/role:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: "Invalid role" }, { status: 400 })
    }
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
