/**
 * GET /api/guest/scan/[roomId]
 *
 * Called automatically when the guest lands on /roomQRCode/[roomId] without a token.
 * 1. Generates a cryptographically secure random token.
 * 2. Persists it to ScanSession with a 5-minute expiry.
 * 3. Redirects the browser back to /roomQRCode/[roomId]?token=<TOKEN>
 *    so the physical QR code URL never needs to change.
 */

import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';

const SESSION_DURATION_MS = 5 * 60 * 1000; // 5 minutes

export async function GET(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;

  // Purge any already-expired sessions for this room (housekeeping)
  const now = new Date().toISOString();
  await prisma.scanSession.deleteMany({
    where: { roomId, expiresAt: { lt: now } },
  }).catch(() => { /* non-fatal */ });

  // Generate a secure random token
  const token = crypto.randomBytes(48).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();
  const id = crypto.randomBytes(16).toString('hex');

  await prisma.scanSession.create({
    data: { id, token, roomId, expiresAt },
  });

  // Redirect back to the existing QR page URL with ?token= appended
  const origin = new URL(request.url).origin;
  const redirectUrl = `${origin}/roomQRCode/${encodeURIComponent(roomId)}?token=${token}`;

  const response = NextResponse.redirect(redirectUrl, { status: 302 });
  // Prevent caching the redirect itself
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  return response;
}
