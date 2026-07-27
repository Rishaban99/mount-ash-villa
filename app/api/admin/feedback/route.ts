import { NextResponse } from 'next/server';
import { getGuestFeedbacks, markGuestFeedbackAsRead } from '@/lib/db';
import { ensureDb } from '@/lib/api-utils';

export async function GET() {
  try {
    await ensureDb();
    const feedbacks = await getGuestFeedbacks();
    return NextResponse.json(feedbacks);
  } catch (error) {
    console.error('Error fetching feedbacks:', error);
    return NextResponse.json({ error: 'Failed to fetch feedbacks' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    await ensureDb();
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: 'Feedback ID is required' }, { status: 400 });
    }

    await markGuestFeedbackAsRead(String(id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error marking feedback as read:', error);
    return NextResponse.json({ error: 'Failed to update feedback' }, { status: 500 });
  }
}
