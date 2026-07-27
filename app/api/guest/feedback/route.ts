import { NextResponse } from 'next/server';
import { saveGuestFeedback } from '@/lib/db';
import { ensureDb } from '@/lib/api-utils';

export async function POST(request: Request) {
  try {
    await ensureDb();
    const body = await request.json();

    const { roomNumber, guestName, rating, category, message } = body;

    if (!roomNumber || !rating) {
      return NextResponse.json({ error: 'Room number and rating are required' }, { status: 400 });
    }

    const saved = await saveGuestFeedback({
      roomNumber: String(roomNumber),
      guestName: guestName ? String(guestName) : 'Guest',
      rating: Number(rating),
      category: category ? String(category) : undefined,
      message: message ? String(message) : undefined,
    });

    return NextResponse.json({ success: true, feedback: saved });
  } catch (error) {
    console.error('Error saving feedback:', error);
    return NextResponse.json({ error: 'Failed to submit feedback' }, { status: 500 });
  }
}
