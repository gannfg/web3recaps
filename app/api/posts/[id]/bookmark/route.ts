import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Posts don't support bookmarks in the current schema
  return NextResponse.json({ 
    success: false, 
    error: "Posts do not support bookmarks" 
  }, { status: 400 });
}
