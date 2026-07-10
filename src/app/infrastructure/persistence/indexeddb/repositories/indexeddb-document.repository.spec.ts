import { TestBed } from '@angular/core/testing';

import { STORAGE_PROVIDER } from '../../../../core/di/storage.tokens';
import type { TravelDocument } from '../../../../domain/entities/travel-document';
import type { AppDb, DocumentBlobRecord } from '../app-db';
import { IndexedDBStorageProvider } from '../indexeddb-storage-provider';
import type { DocumentRecord } from '../records/document.record';

import { IndexedDBDocumentRepository } from './indexeddb-document.repository';

/**
 * Regression coverage for BUG 1 (production incident): `saveWithBlob`
 * opened a Dexie transaction scoped to `['documents']` but wrote to the
 * `documentBlobs` store from inside it — a store outside the transaction's
 * scope. Real Dexie throws `NotFoundError: The specified object store was
 * not found` in that situation. The fix (`indexeddb-storage-provider.ts`
 * `transaction()`) always adds `documentBlobs` to the Dexie scope.
 *
 * This spec swaps the real Dexie `AppDb` for a structural fake that
 * enforces the SAME transaction-scoping contract Dexie enforces (an
 * operation on a table throws if that table wasn't included in the
 * enclosing `db.transaction(mode, tables, work)` call), without needing
 * `fake-indexeddb` (not installed in this project) or real browser
 * IndexedDB. If the fix in `indexeddb-storage-provider.ts` is ever reverted
 * or narrowed, `saveWithBlob` below throws again and this spec fails.
 */

/** Common shape the fake `db.transaction()` needs to scope-check. */
interface ScopedTable {
  readonly name: string;
}

/**
 * Minimal in-memory Dexie `Table` stand-in. Scoping is enforced against the
 * OWNING db's currently-active transaction (`FakeAppDb.activeScope`) rather
 * than a per-table flag — this mirrors real Dexie, where a table not
 * included in an ENCLOSING transaction throws even though the exact same
 * table works fine called with no enclosing transaction at all (auto-txn).
 */
class FakeTable<T extends { id: string }> implements ScopedTable {
  private readonly rows = new Map<string, T>();

  constructor(
    readonly name: string,
    private readonly db: FakeAppDb,
  ) {}

  async get(id: string): Promise<T | undefined> {
    this.assertInScope();
    return this.rows.get(id);
  }

  async put(record: T): Promise<void> {
    this.assertInScope();
    this.rows.set(record.id, record);
  }

  async delete(id: string): Promise<void> {
    this.assertInScope();
    this.rows.delete(id);
  }

  async toArray(): Promise<T[]> {
    this.assertInScope();
    return [...this.rows.values()];
  }

  private assertInScope(): void {
    const scope = this.db.activeScope;
    if (scope && !scope.has(this)) {
      throw new Error(
        `NotFoundError: The specified object store '${this.name}' was not found ` +
          'in this transaction scope.',
      );
    }
  }
}

/** Structural fake of `AppDb` — no real IndexedDB/Dexie involved. */
class FakeAppDb {
  /** The scope of the currently-running `transaction()` call, if any. */
  activeScope: Set<ScopedTable> | null = null;

  documents = new FakeTable<DocumentRecord>('documents', this);
  documentBlobs = new FakeTable<DocumentBlobRecord>('documentBlobs', this);

  async open(): Promise<void> {
    /* no-op */
  }

  async transaction<T>(
    _mode: 'r' | 'rw',
    tables: ScopedTable[],
    work: () => Promise<T>,
  ): Promise<T> {
    const previousScope = this.activeScope;
    this.activeScope = new Set(tables);
    try {
      return await work();
    } finally {
      this.activeScope = previousScope;
    }
  }
}

function makeDocument(overrides: Partial<TravelDocument> = {}): TravelDocument {
  return {
    id: 'doc-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    deletedAt: null,
    syncStatus: 'local',
    lastModified: '2026-01-01T00:00:00.000Z',
    travelId: 'trip-1',
    title: 'Passport scan',
    category: 'passport',
    fileName: 'passport.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 12,
    blobId: 'blob-1',
    ...overrides,
  };
}

describe('IndexedDBDocumentRepository.saveWithBlob — object-store scope regression (BUG 1)', () => {
  let repo: IndexedDBDocumentRepository;
  let fakeDb: FakeAppDb;

  beforeEach(() => {
    fakeDb = new FakeAppDb();

    TestBed.configureTestingModule({
      providers: [
        IndexedDBDocumentRepository,
        {
          provide: STORAGE_PROVIDER,
          useFactory: () => {
            const provider = new IndexedDBStorageProvider();
            // Swap the real Dexie `AppDb` for the scoping-aware fake — this
            // test targets the transaction-scoping CONTRACT (design §6/§8),
            // not Dexie itself, and needs no real/fake IndexedDB.
            (provider as unknown as { db: AppDb }).db = fakeDb as unknown as AppDb;
            return provider;
          },
        },
      ],
    });

    repo = TestBed.inject(IndexedDBDocumentRepository);
  });

  it('saves the document metadata AND the blob without throwing, and the blob reads back', async () => {
    const doc = makeDocument();
    const blob = new Blob(['fake-bytes'], { type: 'application/pdf' });

    await expectAsync(repo.saveWithBlob(doc, blob)).toBeResolved();

    const storedBlob = await repo.getBlob(doc.id);
    expect(storedBlob).toBeDefined();
    expect(await storedBlob?.text()).toBe('fake-bytes');
  });

  it('softDelete removes the blob (also written/read from outside a transaction)', async () => {
    const doc = makeDocument({ id: 'doc-2', blobId: 'blob-2' });
    await repo.saveWithBlob(doc, new Blob(['other-bytes']));

    await repo.softDelete(doc.id);

    expect(await repo.getBlob(doc.id)).toBeUndefined();
  });

  it(
    'regression guard: fails loudly if `documentBlobs` is ever dropped from the ' +
      'transaction scope again (reproduces the original NotFoundError)',
    async () => {
      const original = fakeDb.transaction.bind(fakeDb);
      // Simulate the ORIGINAL bug: whatever scope the provider builds, strip
      // `documentBlobs` back out of it before delegating.
      fakeDb.transaction = (<T>(mode: 'r' | 'rw', tables: ScopedTable[], work: () => Promise<T>) =>
        original(
          mode,
          tables.filter((table) => table !== fakeDb.documentBlobs),
          work,
        )) as typeof fakeDb.transaction;

      const doc = makeDocument({ id: 'doc-3', blobId: 'blob-3' });

      await expectAsync(repo.saveWithBlob(doc, new Blob(['x']))).toBeRejectedWithError(
        /documentBlobs/,
      );
    },
  );
});
