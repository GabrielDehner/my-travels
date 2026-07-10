import { TestBed } from '@angular/core/testing';

import { STORAGE_PROVIDER } from '../../../../core/di/storage.tokens';
import type { QuerySpec } from '../../../../domain/shared/query-spec';
import type { CollectionName, StorageProvider } from '../../storage-provider';
import type { TransportRecord } from '../records/transport.record';

import { IndexedDBTransportRepository } from './indexeddb-transport.repository';

/** In-memory fake `StorageProvider` — no real IndexedDB/Dexie involved. */
class FakeStorageProvider implements StorageProvider {
  private readonly collections = new Map<CollectionName, Map<string, unknown>>();

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
    put: async (): Promise<void> => {
      /* unused in this spec */
    },
    get: async (): Promise<Blob | undefined> => undefined,
    delete: async (): Promise<void> => {
      /* unused in this spec */
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

function makeRecord(overrides: Partial<TransportRecord> = {}): TransportRecord {
  return {
    id: 'transport-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    deletedAt: null,
    syncStatus: 'local',
    lastModified: '2026-01-01T00:00:00.000Z',
    destinationId: 'destination-1',
    type: 'flight',
    ...overrides,
  };
}

describe('IndexedDBTransportRepository', () => {
  let repo: IndexedDBTransportRepository;
  let storage: FakeStorageProvider;

  beforeEach(() => {
    storage = new FakeStorageProvider();
    TestBed.configureTestingModule({
      providers: [
        IndexedDBTransportRepository,
        { provide: STORAGE_PROVIDER, useValue: storage },
      ],
    });
    repo = TestBed.inject(IndexedDBTransportRepository);
  });

  it('getByDestination returns only records for the given destination', async () => {
    await storage.put('transports', makeRecord({ id: 't1', destinationId: 'destination-1' }));
    await storage.put('transports', makeRecord({ id: 't2', destinationId: 'destination-2' }));

    const results = await repo.getByDestination('destination-1');

    expect(results.map((t) => t.id)).toEqual(['t1']);
  });

  it('getByDestination excludes soft-deleted records (deletedAt != null)', async () => {
    await storage.put('transports', makeRecord({ id: 't1', deletedAt: null }));
    await storage.put(
      'transports',
      makeRecord({ id: 't2', deletedAt: '2026-02-01T00:00:00.000Z' }),
    );

    const results = await repo.getByDestination('destination-1');

    expect(results.map((t) => t.id)).toEqual(['t1']);
  });

  it('softDelete sets deletedAt on the record and does not physically remove it', async () => {
    await storage.put('transports', makeRecord({ id: 't1', deletedAt: null }));

    await repo.softDelete('t1');

    const stored = await storage.getById<TransportRecord>('transports', 't1');
    expect(stored?.deletedAt).not.toBeNull();
    expect(await repo.getByDestination('destination-1')).toEqual([]);
  });

  it('softDelete on a non-existent id is a safe no-op', async () => {
    await expectAsync(repo.softDelete('missing')).toBeResolved();
  });

  it('save persists a new record retrievable via getByDestination', async () => {
    await repo.save({
      id: 't1',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      deletedAt: null,
      syncStatus: 'local',
      lastModified: '2026-01-01T00:00:00.000Z',
      destinationId: 'destination-1',
      type: 'train',
    });

    const results = await repo.getByDestination('destination-1');
    expect(results.length).toBe(1);
    expect(results[0]?.type).toBe('train');
  });

  it('query excludes soft-deleted records from the results', async () => {
    await storage.put('transports', makeRecord({ id: 't1', deletedAt: null }));
    await storage.put(
      'transports',
      makeRecord({ id: 't2', deletedAt: '2026-02-01T00:00:00.000Z' }),
    );
    spyOn(storage, 'query').and.callFake(
      async <T>(): Promise<T[]> =>
        [
          makeRecord({ id: 't1', deletedAt: null }),
          makeRecord({ id: 't2', deletedAt: '2026-02-01T00:00:00.000Z' }),
        ] as unknown as T[],
    );

    const results = await repo.query({});

    expect(results.map((t) => t.id)).toEqual(['t1']);
  });
});
