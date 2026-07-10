import { Injectable } from '@angular/core';

/** Result of `navigator.storage.estimate()`. */
export interface StorageEstimate {
  usage: number;
  quota: number;
}

/**
 * Wraps the browser Storage API so document blobs are not silently evicted
 * under storage pressure, and so the UI can warn as usage approaches quota
 * (design §9).
 */
@Injectable({ providedIn: 'root' })
export class StorageQuotaService {
  /** Requests persistent storage; guarded by `persisted()` to avoid redundant prompts. */
  async requestPersistence(): Promise<boolean> {
    if (!navigator.storage?.persist) return false;
    if (await this.isPersisted()) return true;
    return navigator.storage.persist();
  }

  async isPersisted(): Promise<boolean> {
    if (!navigator.storage?.persisted) return false;
    return navigator.storage.persisted();
  }

  /** Returns `{ usage, quota }` in bytes, or `undefined` if unsupported. */
  async estimate(): Promise<StorageEstimate | undefined> {
    if (!navigator.storage?.estimate) return undefined;
    const { usage, quota } = await navigator.storage.estimate();
    return { usage: usage ?? 0, quota: quota ?? 0 };
  }

  /** Ratio in [0, 1] of usage/quota, or `undefined` if unsupported. */
  async usageRatio(): Promise<number | undefined> {
    const result = await this.estimate();
    if (!result || result.quota === 0) return undefined;
    return result.usage / result.quota;
  }
}
