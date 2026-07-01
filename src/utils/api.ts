/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

function getActorHeaders(): Record<string, string> {
  try {
    const cached = localStorage.getItem('hotel_pos_user');
    if (!cached) return {};
    const user = JSON.parse(cached);
    return {
      'X-Actor-User-Id': user.id ?? '',
      'X-Actor-Name': user.name ?? '',
      'X-Actor-Role': user.role ?? '',
    };
  } catch {
    return {};
  }
}

export function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  const actorHeaders = getActorHeaders();
  for (const [key, value] of Object.entries(actorHeaders)) {
    if (value && !headers.has(key)) {
      headers.set(key, value);
    }
  }
  return fetch(input, { ...init, headers });
}
