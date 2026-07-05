/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  return fetch(input, { ...init, credentials: 'include' });
}
