/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { NextResponse } from 'next/server';
import { initializeDatabase } from '@/lib/db';

let dbInitPromise: Promise<void> | undefined;

export async function ensureDb(): Promise<void> {
  if (!dbInitPromise) {
    dbInitPromise = initializeDatabase();
  }
  await dbInitPromise;
}

export function jsonResponse(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function errorResponse(message: string, status = 500) {
  return NextResponse.json({ error: message }, { status });
}

export function isToday(dateString: string) {
  try {
    const d = new Date(dateString);
    const today = new Date();
    return (
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear()
    );
  } catch {
    return false;
  }
}
