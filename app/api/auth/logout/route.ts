/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { cookies } from 'next/headers';
import { clearSessionCookieOptions } from '@/lib/session';
import { jsonResponse } from '@/lib/api-utils';

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.set(clearSessionCookieOptions());
  return jsonResponse({ success: true });
}
