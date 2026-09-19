import { getAmenities } from '@/lib/db';
import { ensureDb, errorResponse, jsonResponse } from '@/lib/api-utils';

export async function GET() {
  try {
    await ensureDb();
    const amenities = await getAmenities();
    const availableAmenities = amenities.filter((a) => a.isAvailable !== false);
    const response = jsonResponse(availableAmenities);
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    return response;
  } catch (err) {
    console.error('Error fetching guest amenities:', err);
    return errorResponse('Failed to fetch amenities list', 500);
  }
}
