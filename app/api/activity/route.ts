import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServer();
    if (!supabase) {
      return NextResponse.json({ success: false, error: "Supabase not configured" }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const userId = searchParams.get('userId'); // Optional: filter by specific user

    const activities: any[] = [];

    // 1. Recent Posts (with author info)
    const { data: recentPosts } = await supabase
      .from('posts')
      .select(`
        id,
        short_id,
        title,
        content,
        post_type,
        likes_count,
        comments_count,
        created_at,
        author:users!posts_author_id_fkey(
          id,
          display_name,
          avatar_url,
          role
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (recentPosts) {
      recentPosts.forEach((post: any) => {
        activities.push({
          id: `post-${post.id}`,
          type: 'post_created',
          title: 'New Post',
          description: post.title || post.content?.substring(0, 100) + '...',
          author: post.author,
          entity: {
            id: post.id,
            type: 'post',
            shortId: post.short_id,
            postType: post.post_type,
            likesCount: post.likes_count || 0,
            commentsCount: post.comments_count || 0
          },
          timestamp: post.created_at,
          priority: 'medium'
        });
      });
    }

    // 2. Recent Events (with creator info)
    const { data: recentEvents } = await supabase
      .from('events')
      .select(`
        id,
        title,
        description,
        event_type,
        event_date,
        start_time,
        location,
        current_attendees_count,
        max_attendees,
        created_at,
        creator:users!events_creator_id_fkey(
          id,
          display_name,
          avatar_url,
          role
        )
      `)
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (recentEvents) {
      recentEvents.forEach((event: any) => {
        activities.push({
          id: `event-${event.id}`,
          type: 'event_created',
          title: 'New Event',
          description: event.title,
          author: event.creator,
          entity: {
            id: event.id,
            type: 'event',
            eventType: event.event_type,
            eventDate: event.event_date,
            startTime: event.start_time,
            location: event.location,
            attendeesCount: event.current_attendees_count || 0,
            maxAttendees: event.max_attendees
          },
          timestamp: event.created_at,
          priority: 'high'
        });
      });
    }

    // 3. Recent Projects (with creator info)
    const { data: recentProjects } = await supabase
      .from('projects')
      .select(`
        id,
        name,
        tagline,
        description,
        project_type,
        status,
        views_count,
        likes_count,
        created_at,
        created_by:users!projects_created_by_fkey(
          id,
          display_name,
          avatar_url,
          role
        )
      `)
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (recentProjects) {
      recentProjects.forEach((project: any) => {
        activities.push({
          id: `project-${project.id}`,
          type: 'project_created',
          title: 'New Project',
          description: project.name,
          author: project.created_by,
          entity: {
            id: project.id,
            type: 'project',
            projectType: project.project_type,
            status: project.status,
            viewsCount: project.views_count || 0,
            likesCount: project.likes_count || 0
          },
          timestamp: project.created_at,
          priority: 'high'
        });
      });
    }

    // 4. Recent Teams (with creator info)
    const { data: recentTeams } = await supabase
      .from('teams')
      .select(`
        id,
        name,
        description,
        status,
        current_member_count,
        max_members,
        created_at,
        created_by:users!teams_created_by_fkey(
          id,
          display_name,
          avatar_url,
          role
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (recentTeams) {
      recentTeams.forEach((team: any) => {
        activities.push({
          id: `team-${team.id}`,
          type: 'team_created',
          title: 'New Team',
          description: team.name,
          author: team.created_by,
          entity: {
            id: team.id,
            type: 'team',
            status: team.status,
            memberCount: team.current_member_count || 0,
            maxMembers: team.max_members
          },
          timestamp: team.created_at,
          priority: 'medium'
        });
      });
    }

    // 5. Recent Comments (with author and post info)
    const { data: recentComments } = await supabase
      .from('post_comments')
      .select(`
        id,
        content,
        created_at,
        author:users!post_comments_author_id_fkey(
          id,
          display_name,
          avatar_url,
          role
        ),
        post:posts!post_comments_post_id_fkey(
          id,
          title,
          short_id
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (recentComments) {
      recentComments.forEach((comment: any) => {
        activities.push({
          id: `comment-${comment.id}`,
          type: 'comment_added',
          title: 'New Comment',
          description: `Commented on "${comment.post?.title || `Post #${comment.post?.short_id}`}"`,
          author: comment.author,
          entity: {
            id: comment.id,
            type: 'comment',
            postId: comment.post?.id,
            postTitle: comment.post?.title,
            postShortId: comment.post?.short_id,
            content: comment.content
          },
          timestamp: comment.created_at,
          priority: 'low'
        });
      });
    }

    // 6. Recent News Articles (with author info)
    const { data: recentNews } = await supabase
      .from('news_articles')
      .select(`
        id,
        title,
        slug,
        excerpt,
        view_count,
        created_at,
        author:users!news_articles_author_id_fkey(
          id,
          display_name,
          avatar_url,
          role
        )
      `)
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (recentNews) {
      recentNews.forEach((article: any) => {
        activities.push({
          id: `news-${article.id}`,
          type: 'news_published',
          title: 'New Article',
          description: article.title,
          author: article.author,
          entity: {
            id: article.id,
            type: 'news',
            slug: article.slug,
            viewCount: article.view_count || 0
          },
          timestamp: article.created_at,
          priority: 'high'
        });
      });
    }

    // Sort all activities by timestamp (newest first)
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Apply limit to final results
    const limitedActivities = activities.slice(0, limit);

    return NextResponse.json({
      success: true,
      data: {
        activities: limitedActivities,
        total: activities.length
      }
    });

  } catch (error) {
    console.error('Error fetching activity:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch activity' },
      { status: 500 }
    );
  }
}
