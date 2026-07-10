import { InjectionToken } from '@angular/core';

import type { StorageProvider } from '../../infrastructure/persistence/storage-provider';

/**
 * Port token for the low-level storage seam (design §5, §6). Bound to
 * `IndexedDBStorageProvider` today; a future `ApiStorageProvider` rebinds
 * this single token — see `providers.ts` (the documented v2 swap point).
 */
export const STORAGE_PROVIDER = new InjectionToken<StorageProvider>('STORAGE_PROVIDER');
