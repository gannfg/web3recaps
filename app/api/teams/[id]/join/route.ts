import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServer } from "@/lib/supabase/server"
import { requireUser } from "@/lib/auth"
import { awardXp } from "@/lib/gamification"
import { XP_VALUES } from "@/lib/types"
import { checkAndRecordAction } from '@/lib/rate-limiting';
import { notifyTeamMemberJoined } from '@/lib/notification-service';

async function getAuthedClient(request: NextRequest) {
  const auth = await requireUser(request)
  if (!auth.supabase || !auth.user) return { supabase: null, user: null }
  return { supabase: auth.supabase, user: auth.user }
}

// POST /api/teams/[id]/join - Join team
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { supabase, user } = await getAuthedClient(request)
    if (!supabase || !user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

    const userId = user.id

    const teamId = params.id

    // Check if team exists and is recruiting
    const { data: teamData, error: teamError } = await supabase
      .from('teams')
      .select('id, status, max_members, name')
      .eq('id', teamId)
      .single()

    if (teamError || !teamData) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 })
    }

    if (teamData.status !== 'recruiting') {
      return NextResponse.json({ error: "Team is not currently recruiting" }, { status: 400 })
    }

    // Check if user is already a member
    const { data: existingMember } = await supabase
      .from('team_members')
      .select('id, is_active')
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .single()

    if (existingMember) {
      if (existingMember.is_active) {
        return NextResponse.json({ error: "You are already a member of this team" }, { status: 400 })
      } else {
        // Reactivate membership
        const { error: reactivateError } = await supabase
          .from('team_members')
          .update({ is_active: true })
          .eq('id', existingMember.id)

        if (reactivateError) {
          console.error("Reactivate member error:", reactivateError)
          return NextResponse.json({ error: "Failed to rejoin team" }, { status: 400 })
        }

        return NextResponse.json({
          success: true,
          message: "Successfully rejoined the team",
        })
      }
    }

    // Check if team is full
    const { count: currentMemberCount } = await supabase
      .from('team_members')
      .select('*', { count: 'exact', head: true })
      .eq('team_id', teamId)
      .eq('is_active', true)

    if (currentMemberCount && currentMemberCount >= teamData.max_members) {
      return NextResponse.json({ error: "Team is at maximum capacity" }, { status: 400 })
    }

    // Check rate limit for joining teams
    const rateLimitResult = await checkAndRecordAction(userId, 'join_team', {
      cooldownMs: 10000, // 10 second cooldown
      dailyLimit: 10      // 10 team joins per day
    });

    if (!rateLimitResult.allowed) {
      return NextResponse.json({ 
        error: rateLimitResult.reason,
        remaining: rateLimitResult.remaining,
        resetTime: rateLimitResult.resetTime
      }, { status: 429 });
    }

    // Add user as team member
    const { error: memberError } = await supabase
      .from('team_members')
      .insert({
        team_id: teamId,
        user_id: userId,
        role: 'member',
        permissions: [],
        contribution_score: 0,
        is_active: true,
      })

    if (memberError) {
      console.error("Add member error:", memberError)
      return NextResponse.json({ error: "Failed to join team" }, { status: 400 })
    }

    // Award XP for joining team
    awardXp(userId, XP_VALUES.JOIN_TEAM, "Joined team", { 
      teamId,
      teamName: teamData.name
    }).catch(() => {
      // Silently fail - XP will be handled by background processes
    });

    // Notify existing team members about the new member
    const { data: existingMembers } = await supabase
      .from('team_members')
      .select('user_id')
      .eq('team_id', teamId)
      .eq('is_active', true)
      .neq('user_id', userId); // Don't notify the person who just joined

    if (existingMembers && existingMembers.length > 0) {
      const memberIds = existingMembers.map((member: any) => member.user_id);
      notifyTeamMemberJoined(teamId, teamData.name, memberIds, userId).catch(() => {
        // Silently fail - notifications are not critical
      });
    }

    return NextResponse.json({
      success: true,
      message: "Successfully joined the team",
    })
  } catch (error) {
    console.error("Join team error:", error)
    return NextResponse.json(
      { error: "Failed to join team" },
      { status: 500 }
    )
  }
}