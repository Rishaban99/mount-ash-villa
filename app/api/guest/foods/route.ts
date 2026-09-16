import { getFoods } from '@/lib/db';
import { ensureDb, errorResponse, jsonResponse } from '@/lib/api-utils';

export async function GET() {
  try {
    await ensureDb();
    const foods = await getFoods();
    const availableFoods = foods.filter((f) => f.isAvailable !== false);
    const response = jsonResponse(availableFoods);
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    return response;
  } catch (err) {
    console.error('Error fetching guest food menu:', err);
    return errorResponse('Failed to fetch food menu', 500);
  }
}
