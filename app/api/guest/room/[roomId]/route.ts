/**
 * GET /api/guest/room/[roomId]?token=<TOKEN>
 *
 * Secured version — requires a valid, non-expired ScanSession token.
 * Returns room + bill + settings with strict anti-caching headers.
 */

import { getBills, getRooms, getSettings } from '@/lib/db';
import { ensureDb, errorResponse, jsonResponse } from '@/lib/api-utils';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    await ensureDb();

    const { roomId } = await params;
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    // ── Token presence check ────────────────────────────────────────────────
    if (!token) {
      return errorResponse('Missing session token. Please scan the QR code again.', 401);
    }

    // ── Token validation ────────────────────────────────────────────────────
    const session = await prisma.scanSession.findUnique({ where: { token } });

    if (!session) {
      return errorResponse('Invalid session. Please scan the QR code again.', 401);
    }

    // ── Expiry check (backend is the authority) ─────────────────────────────
    if (new Date() > new Date(session.expiresAt)) {
      // Clean up the expired token
      await prisma.scanSession.delete({ where: { token } }).catch(() => {});
      return errorResponse('Session Expired. Please scan the QR code again.', 410);
    }

    // ── Fetch data ──────────────────────────────────────────────────────────
    const [rooms, bills, settings] = await Promise.all([
      getRooms(),
      getBills(),
      getSettings(),
    ]);

    // Match by room number (QR code uses roomNumber) or DB id
    const room = rooms.find(
      (r) => r.roomNumber === roomId || r.id === roomId
    );

    if (!room) {
      return errorResponse('Room not found', 404);
    }

    // Find the latest active bill for this room
    const activeBill = bills.find(
      (b) =>
        b.status === 'Active' &&
        b.roomItems.some(
          (ri) => ri.roomNumber === room.roomNumber || ri.roomId === room.id
        )
    );

    // ── Respond with strict anti-caching headers ────────────────────────────
    const payload = {
      room,
      bill: activeBill ?? null,
      settings: {
        hotelName: settings.hotelName,
        phone: settings.phone,
        address: settings.address,
        currency: settings.currency,
        serviceChargePercent: settings.serviceChargePercent,
        checkInTime: settings.checkInTime,
        checkOutTime: settings.checkOutTime,
      },
      sessionExpiresAt: session.expiresAt,
    };

    const response = jsonResponse(payload);
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    return response;

  } catch (err) {
    console.error('[guest/room] error:', err);
    return errorResponse('Failed to fetch room data', 500);
  }
}
