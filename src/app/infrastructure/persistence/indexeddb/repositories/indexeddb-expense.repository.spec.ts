import { TestBed } from '@angular/core/testing';

import { STORAGE_PROVIDER } from '../../../../core/di/storage.tokens';
import type { QuerySpec } from '../../../../domain/shared/query-spec';
import type { CollectionName, StorageProvider } from '../../storage-provider';
import type { ExpenseRecord } from '../records/expense.record';

import { IndexedDBExpenseRepository } from './indexeddb-expense.repository';

/** In-memory fake `StorageProvider` — no real IndexedDB/Dexie involved. */
class FakeStorageProvider implements StorageProvider {
  private readonly collections = new Map<CollectionName, Map<string, unknown>>();
  private readonly blobStore = new Map<string, Blob>();

  async init(): Promise<void> {
    /* no-op */
  }

  isReady(): boolean {
    return true;
  }

  async getById<T>(collection: CollectionName, id: string): Promise<T | undefined> {
    return this.table(collection).get(id) as T | undefined;
  }

  async getAll<T>(collection: CollectionName): Promise<T[]> {
    return [...this.table(collection).values()] as T[];
  }

  async query<T>(_collection: CollectionName, _spec: QuerySpec<T>): Promise<T[]> {
    return [];
  }

  async put<T>(collection: CollectionName, record: T): Promise<void> {
    this.table(collection).set((record as unknown as { id: string }).id, record);
  }

  async bulkPut<T>(collection: CollectionName, records: T[]): Promise<void> {
    for (const record of records) {
      this.table(collection).set((record as unknown as { id: string }).id, record);
    }
  }

  async delete(collection: CollectionName, id: string): Promise<void> {
    this.table(collection).delete(id);
  }

  readonly blobs = {
    put: async (id: string, blob: Blob): Promise<void> => {
      this.blobStore.set(id, blob);
    },
    get: async (id: string): Promise<Blob | undefined> => this.blobStore.get(id),
    delete: async (id: string): Promise<void> => {
      this.blobStore.delete(id);
    },
  };

  async transaction<T>(_collections: CollectionName[], work: () => Promise<T>): Promise<T> {
    return work();
  }

  private table(collection: CollectionName): Map<string, unknown> {
    let table = this.collections.get(collection);
    if (!table) {
      table = new Map();
      this.collections.set(collection, table);
    }
    return table;
  }
}

function makeRecord(overrides: Partial<ExpenseRecord> = {}): ExpenseRecord {
  return {
    id: 'expense-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    deletedAt: null,
    syncStatus: 'local',
    lastModified: '2026-01-01T00:00:00.000Z',
    travelId: 'travel-1',
    category: 'food',
    amount: { amountMinor: 1000, currency: 'USD' },
    date: '2026-01-01',
    ...overrides,
  };
}

describe('IndexedDBExpenseRepository', () => {
  let repo: IndexedDBExpenseRepository;
  let storage: FakeStorageProvider;

  beforeEach(() => {
    storage = new FakeStorageProvider();
    TestBed.configureTestingModule({
      providers: [IndexedDBExpenseRepository, { provide: STORAGE_PROVIDER, useValue: storage }],
    });
    repo = TestBed.inject(IndexedDBExpenseRepository);
  });

  it('getByTravel returns only non-deleted records for the given travel', async () => {
    await storage.put('expenses', makeRecord({ id: 'e1', travelId: 'travel-1' }));
    await storage.put('expenses', makeRecord({ id: 'e2', travelId: 'travel-2' }));

    const results = await repo.getByTravel('travel-1');

    expect(results.map((e) => e.id)).toEqual(['e1']);
  });

  it('saveReceipt stores the blob under a derived id and returns it', async () => {
    const blob = new Blob(['receipt-bytes'], { type: 'image/jpeg' });

    const receiptBlobId = await repo.saveReceipt('expense-1', blob);

    expect(receiptBlobId).toBe('receipt-expense-1');
    expect(await storage.blobs.get(receiptBlobId)).toBe(blob);
  });

  it('getReceipt round-trips the exact blob previously saved via saveReceipt', async () => {
    const blob = new Blob(['receipt-bytes'], { type: 'image/png' });
    const receiptBlobId = await repo.saveReceipt('expense-1', blob);

    const result = await repo.getReceipt(receiptBlobId);

    expect(result).toBe(blob);
  });

  it('getReceipt returns undefined for an id with no stored blob', async () => {
    const result = await repo.getReceipt('receipt-missing');

    expect(result).toBeUndefined();
  });
});
