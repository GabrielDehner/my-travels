import { Injectable } from '@angular/core';
import type { Table } from 'dexie';

import type { QuerySpec } from '../../../domain/shared/query-spec';
import type { CollectionName, StorageProvider } from '../storage-provider';

import { AppDb } from './app-db';
import { runQuery } from './query-translator';

/**
 * Dexie-backed implementation of the `StorageProvider` port (design §6,
 * §8). The ONLY infrastructure class that opens `AppDb` directly. Provided
 * only via `provideDataLayer()`'s `STORAGE_PROVIDER` binding (no
 * `providedIn: 'root'`) — the DI token is the single path to this class,
 * which is what makes it the documented v2 swap point.
 */
@Injectable()
export class IndexedDBStorageProvider implements StorageProvider {
  private readonly db = new AppDb();
  private ready = false;

  async init(): Promise<void> {
    await this.db.open();
    this.ready = true;
  }

  isReady(): boolean {
    return this.ready;
  }

  async getById<T>(collection: CollectionName, id: string): Promise<T | undefined> {
    return this.table<T>(collection).get(id);
  }

  async getAll<T>(collection: CollectionName): Promise<T[]> {
    return this.table<T>(collection).toArray();
  }

  async query<T>(collection: CollectionName, spec: QuerySpec<T>): Promise<T[]> {
    return runQuery(this.table<T>(collection), spec);
  }

  async put<T>(collection: CollectionName, record: T): Promise<void> {
    await this.table<T>(collection).put(record);
  }

  async bulkPut<T>(collection: CollectionName, records: T[]): Promise<void> {
    await this.table<T>(collection).bulkPut(records);
  }

  async delete(collection: CollectionName, id: string): Promise<void> {
    await this.table(collection).delete(id);
  }

  readonly blobs = {
    put: async (id: string, blob: Blob): Promise<void> => {
      await this.db.documentBlobs.put({ id, blob });
    },
    get: async (id: string): Promise<Blob | undefined> => {
      const record = await this.db.documentBlobs.get(id);
      return record?.blob;
    },
    delete: async (id: string): Promise<void> => {
      await this.db.documentBlobs.delete(id);
    },
  };

  async transaction<T>(collections: CollectionName[], work: () => Promise<T>): Promise<T> {
    // The `documentBlobs` store is not part of the public `CollectionName`
    // union (blob access goes through the dedicated `blobs` helper, not
    // `table()`), so it must be added to every transaction's scope
    // explicitly — otherwise Dexie throws "object store was not found" the
    // moment `work()` calls `this.blobs.put/get/delete` from inside a
    // transaction that only listed the metadata collections.
    const tables = [...collections.map((name) => this.table(name)), this.db.documentBlobs];
    return this.db.transaction('rw', tables, work);
  }

  private table<T>(collection: CollectionName): Table<T, string> {
    return this.db[collection] as unknown as Table<T, string>;
  }
}
