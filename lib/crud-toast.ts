/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { toast } from 'sonner';

export function toastCreated(entity: string) {
  toast.success(`${entity} created`);
}

export function toastUpdated(entity: string) {
  toast.success(`${entity} updated`);
}

export function toastDeleted(entity: string) {
  toast.success(`${entity} deleted`);
}

export function toastSaved(entity: string) {
  toast.success(`${entity} saved`);
}

export function toastError(message: string) {
  toast.error(message);
}
