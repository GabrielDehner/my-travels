import type { QuerySpec } from '../../domain/shared/query-spec';

/**
 * Object-store names for the MVP schema (design §6, §8). `transports` was
 * promoted from the deferred Phase 2 reservation (destination-logistics
 * design); `attractions` stays reserved and not created.
 */
export type CollectionName =
  | 'travels'
  | 'destinations'
  | 'hotels'
  | 'transports'
  | 'documents'
  | 'expenses'
  | 'checklists'
  | 'checklistItems'
  | 'notifications';

/**
 * Low-level, provider-neutral storage contract that every repository
 * builds on (design §6, highest-leverage seam). Consumes the domain-owned
 * `QuerySpec<T>` type — infrastructure depending on domain is the correct
 * inward direction under Clean Architecture.
 */
export interface StorageProvider {
  init(): Promise<void>;
  isReady(): boolean;

  getById<T>(collection: CollectionName, id: string): Promise<T | undefined>;
  getAll<T>(collection: CollectionName): Promise<T[]>;
  query<T>(collection: CollectionName, spec: QuerySpec<T>): Promise<T[]>;

  put<T>(collection: CollectionName, record: T): Promise<void>;
  bulkPut<T>(collection: CollectionName, records: T[]): Promise<void>;
  /** Physical delete. Soft-delete (setting `deletedAt`) is a repository concern. */
  delete(collection: CollectionName, id: string): Promise<void>;

  blobs: {
    put(id: string, blob: Blob): Promise<void>;
    get(id: string): Promise<Blob | undefined>;
    delete(id: string): Promise<void>;
  };

  /**
   * Runs `work` atomically over the given collections. Native ACID on
   * IndexedDB today; a future `ApiStorageProvider` degrades this to a
   * sequential passthrough — a documented, bounded seam leak (design §11).
   */
  transaction<T>(collections: CollectionName[], work: () => Promise<T>): Promise<T>;
}
