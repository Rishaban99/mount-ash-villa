/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getFoods, saveFood, deleteFood } from '@/lib/db';
import { buildUpdateDetails, recordAudit } from '@/lib/auditLog';
import { ensureDb, errorResponse, jsonResponse } from '@/lib/api-utils';

export async function GET() {
  try {
    await ensureDb();
    const foods = await getFoods();
    return jsonResponse(foods);
  } catch {
    return errorResponse('Failed to fetch foods', 500);
  }
}

export async function POST(request: Request) {
  try {
    await ensureDb();
    const { id, foodName, category, price } = await request.json();
    if (!foodName || !category || !price) {
      return errorResponse('All food fields are required', 400);
    }

    const foods = await getFoods();
    const existingFood = id ? foods.find((f) => f.id === id) : undefined;
    const updatedFood = await saveFood({
      id: id || '',
      foodName,
      category,
      price: Number(price),
    });
    await recordAudit({
      request,
      action: existingFood ? 'UPDATE' : 'CREATE',
      entityType: 'food',
      entityId: updatedFood.id,
      entityLabel: updatedFood.foodName,
      summary: existingFood
        ? `Updated food item "${updatedFood.foodName}"`
        : `Created food item "${updatedFood.foodName}"`,
      details: existingFood
        ? buildUpdateDetails(
            existingFood as unknown as Record<string, unknown>,
            updatedFood as unknown as Record<string, unknown>,
            ['foodName', 'category', 'price']
          )
        : undefined,
    });
    return jsonResponse(updatedFood);
  } catch {
    return errorResponse('Failed to save food', 500);
  }
}
