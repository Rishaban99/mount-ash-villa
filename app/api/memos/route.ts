/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getMemos, saveMemo, deleteMemo } from '@/lib/db';
import type { FrontdeskMemo } from '@/lib/types';
import { recordAudit } from '@/lib/auditLog';
import { ensureDb, errorResponse, jsonResponse } from '@/lib/api-utils';

export async function GET() {
  try {
    await ensureDb();
    const memos = await getMemos();
    const sorted = [...memos].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return jsonResponse(sorted);
  } catch {
    return errorResponse('Failed to retrieve frontdesk memos', 500);
  }
}

export async function POST(request: Request) {
  try {
    await ensureDb();
    const memo = (await request.json()) as FrontdeskMemo;
    if (!memo.content || !memo.authorName) {
      return errorResponse('Content and author details are required', 400);
    }
    const memos = await getMemos();
    const existingMemo = memo.id ? memos.find((m) => m.id === memo.id) : undefined;
    const saved = await saveMemo(memo);
    await recordAudit({
      request,
      action: existingMemo ? 'UPDATE' : 'CREATE',
      entityType: 'memo',
      entityId: saved.id,
      entityLabel: saved.authorName,
      summary: existingMemo
        ? `Updated memo by "${saved.authorName}"`
        : `Created memo by "${saved.authorName}"`,
    });
    return jsonResponse(saved);
  } catch {
    return errorResponse('Failed to store frontdesk memo', 500);
  }
}
