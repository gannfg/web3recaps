import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { layout_position } = await request.json();
    const eventId = params.id;

    console.log(`Updating event ${eventId} layout position to: ${layout_position}`);

    const supabase = createSupabaseServer();
    if (!supabase) {
      return NextResponse.json({ success: false, error: "Supabase not configured" }, { status: 500 });
    }

    const { data, error } = await supabase
      .from('events')
      .update({ 
        layout_position: layout_position || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', eventId)
      .select()
      .single();

    if (error) {
      console.error('Error updating event layout position:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update event layout position' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { event: data },
      message: 'Event layout position updated successfully'
    });

  } catch (error) {
    console.error('Error in event layout update:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
