import { TestBed } from '@angular/core/testing';
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';

import {
  CHECKLIST_REPOSITORY,
  DESTINATION_REPOSITORY,
  DOCUMENT_REPOSITORY,
  EXPENSE_REPOSITORY,
  HOTEL_REPOSITORY,
  NOTIFICATION_REPOSITORY,
  TRANSPORT_REPOSITORY,
  TRAVEL_REPOSITORY,
} from '../../core/di/repository.tokens';
import { STORAGE_PROVIDER } from '../../core/di/storage.tokens';
import type { Checklist } from '../../domain/entities/checklist';
import type { ChecklistItem } from '../../domain/entities/checklist-item';
import type { Destination } from '../../domain/entities/destination';
import type { Expense } from '../../domain/entities/expense';
import type { Hotel } from '../../domain/entities/hotel';
import type { Notification } from '../../domain/entities/notification';
import type { Transport } from '../../domain/entities/transport';
import type { Travel } from '../../domain/entities/travel';
import type { TravelDocument } from '../../domain/entities/travel-document';
import type { ChecklistRepository } from '../../domain/repositories/checklist.repository';
import type { DestinationRepository } from '../../domain/repositories/destination.repository';
import type { DocumentRepository } from '../../domain/repositories/document.repository';
import type { ExpenseRepository } from '../../domain/repositories/expense.repository';
import type { HotelRepository } from '../../domain/repositories/hotel.repository';
import type { NotificationRepository } from '../../domain/repositories/notification.repository';
import type { TransportRepository } from '../../domain/repositories/transport.repository';
import type { TravelRepository } from '../../domain/repositories/travel.repository';
import type { QuerySpec } from '../../domain/shared/query-spec';
import type { CollectionName, StorageProvider } from '../persistence/storage-provider';

import { TripArchiveImportError, TripArchiveService } from './trip-archive.service';

const notImplemented = async (): Promise<never> => {
  throw new Error('not implemented in this fake — should not be called by this test');
};

class FakeTravelRepository implements TravelRepository {
  constructor(private readonly travel: Travel | undefined) {}
  async getById(): Promise<Travel | undefined> {
    return this.travel;
  }
  getAll = notImplemented;
  save = notImplemented;
  softDelete = notImplemented;
  saveCoverImage = notImplemented;
  getCoverImage = notImplemented;
  async query(_spec: QuerySpec<Travel>): Promise<Travel[]> {
    return this.travel ? [this.travel] : [];
  }
}

class FakeDestinationRepository implements DestinationRepository {
  constructor(private readonly destinations: Destination[]) {}
  async getByTravel(): Promise<Destination[]> {
    return this.destinations;
  }
  save = notImplemented;
  softDelete = notImplemented;
  async query(_spec: QuerySpec<Destination>): Promise<Destination[]> {
    return this.destinations;
  }
}

class FakeHotelRepository implements HotelRepository {
  constructor(private readonly hotels: Hotel[] = []) {}
  async getByDestination(): Promise<Hotel[]> {
    return this.hotels;
  }
  save = notImplemented;
  softDelete = notImplemented;
  async query(_spec: QuerySpec<Hotel>): Promise<Hotel[]> {
    return this.hotels;
  }
}

class FakeTransportRepository implements TransportRepository {
  constructor(private readonly transports: Transport[] = []) {}
  async getByDestination(): Promise<Transport[]> {
    return this.transports;
  }
  save = notImplemented;
  softDelete = notImplemented;
  async query(_spec: QuerySpec<Transport>): Promise<Transport[]> {
    return this.transports;
  }
}

class FakeDocumentRepository implements DocumentRepository {
  constructor(
    private readonly documents: TravelDocument[] = [],
    private readonly blobs = new Map<string, Blob>(),
  ) {}
  async getByTravel(): Promise<TravelDocument[]> {
    return this.documents;
  }
  async getBlob(documentId: string): Promise<Blob | undefined> {
    const doc = this.documents.find((d) => d.id === documentId);
    return doc ? this.blobs.get(doc.blobId) : undefined;
  }
  saveWithBlob = notImplemented;
  softDelete = notImplemented;
  async query(_spec: QuerySpec<TravelDocument>): Promise<TravelDocument[]> {
    return this.documents;
  }
}

class FakeExpenseRepository implements ExpenseRepository {
  constructor(private readonly expenses: Expense[] = []) {}
  async getByTravel(): Promise<Expense[]> {
    return this.expenses;
  }
  save = notImplemented;
  softDelete = notImplemented;
  async query(_spec: QuerySpec<Expense>): Promise<Expense[]> {
    return this.expenses;
  }
}

class FakeChecklistRepository implements ChecklistRepository {
  constructor(
    private readonly checklists: Checklist[] = [],
    private readonly items = new Map<string, ChecklistItem[]>(),
  ) {}
  async getByTravel(): Promise<Checklist[]> {
    return this.checklists;
  }
  async getItems(checklistId: string): Promise<ChecklistItem[]> {
    return this.items.get(checklistId) ?? [];
  }
  saveChecklist = notImplemented;
  saveItem = notImplemented;
  softDelete = notImplemented;
}

class FakeNotificationRepository implements NotificationRepository {
  constructor(private readonly notifications: Notification[] = []) {}
  async getByTravel(): Promise<Notification[]> {
    return this.notifications;
  }
  getDue = notImplemented;
  save = notImplemented;
  markFired = notImplemented;
  softDelete = notImplemented;
}

/** In-memory fake `StorageProvider` — no real IndexedDB/Dexie involved. */
class FakeStorageProvider implements StorageProvider {
  readonly collections = new Map<CollectionName, Map<string, unknown>>();
  readonly blobStore = new Map<string, Blob>();

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

function baseEntityFields(id: string) {
  return {
    id,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    deletedAt: null,
    syncStatus: 'local' as const,
    lastModified: '2026-01-01T00:00:00.000Z',
  };
}

/** Builds and provides a `TripArchiveService` wired to the given fakes. */
function configureService(options: {
  travel?: Travel;
  destinations?: Destination[];
  hotels?: Hotel[];
  transports?: Transport[];
  documents?: TravelDocument[];
  documentBlobs?: Map<string, Blob>;
  expenses?: Expense[];
  checklists?: Checklist[];
  notifications?: Notification[];
  storage?: FakeStorageProvider;
}): TripArchiveService {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      TripArchiveService,
      { provide: TRAVEL_REPOSITORY, useValue: new FakeTravelRepository(options.travel) },
      {
        provide: DESTINATION_REPOSITORY,
        useValue: new FakeDestinationRepository(options.destinations ?? []),
      },
      { provide: HOTEL_REPOSITORY, useValue: new FakeHotelRepository(options.hotels ?? []) },
      {
        provide: TRANSPORT_REPOSITORY,
        useValue: new FakeTransportRepository(options.transports ?? []),
      },
      {
        provide: DOCUMENT_REPOSITORY,
        useValue: new FakeDocumentRepository(options.documents ?? [], options.documentBlobs),
      },
      { provide: EXPENSE_REPOSITORY, useValue: new FakeExpenseRepository(options.expenses ?? []) },
      {
        provide: CHECKLIST_REPOSITORY,
        useValue: new FakeChecklistRepository(options.checklists ?? []),
      },
      {
        provide: NOTIFICATION_REPOSITORY,
        useValue: new FakeNotificationRepository(options.notifications ?? []),
      },
      { provide: STORAGE_PROVIDER, useValue: options.storage ?? new FakeStorageProvider() },
    ],
  });
  return TestBed.inject(TripArchiveService);
}

/** Zips a manifest-shaped object into a Blob the way a real archive would be packaged. */
function zipManifest(manifest: unknown): Blob {
  const zipped = zipSync({ 'manifest.json': strToU8(JSON.stringify(manifest)) });
  return new Blob([zipped as BlobPart], { type: 'application/zip' });
}

/** Reads back the manifest.json from a zipped archive Blob (test-only helper). */
async function readManifest(archive: Blob): Promise<Record<string, unknown>> {
  const buffer = new Uint8Array(await archive.arrayBuffer());
  const files = unzipSync(buffer);
  const manifestBytes = files['manifest.json'];
  if (!manifestBytes) throw new Error('test archive is missing manifest.json');
  return JSON.parse(strFromU8(manifestBytes)) as Record<string, unknown>;
}

describe('TripArchiveService', () => {
  describe('import — backward compatibility with v1 archives', () => {
    it('imports a v1 manifest with NO entities.transports and treats it as empty (does not reject)', async () => {
      const travelId = 'travel-1';
      const v1Manifest = {
        schemaVersion: 1,
        exportedAt: '2025-01-01T00:00:00.000Z',
        appVersion: '0.0.1',
        entities: {
          travels: [
            {
              ...baseEntityFields(travelId),
              title: 'Legacy Trip',
              dates: { start: '2025-06-01', end: '2025-06-10' },
              status: 'completed',
            },
          ],
          destinations: [],
          hotels: [],
          // NOTE: intentionally no `transports` key — this is the v1 shape.
          documents: [],
          expenses: [],
          checklists: [],
          checklistItems: [],
          notifications: [],
        },
      };

      const storage = new FakeStorageProvider();
      const service = configureService({ storage });

      const newTravelId = await service.import(zipManifest(v1Manifest));

      expect(newTravelId).toBeTruthy();
      expect(newTravelId).not.toBe(travelId);
      const transportsAfterImport = await storage.getAll('transports');
      expect(transportsAfterImport).toEqual([]);
    });
  });

  describe('schemaVersion guard', () => {
    it('rejects a schemaVersion greater than the version this app understands', async () => {
      const manifest = {
        schemaVersion: 999,
        exportedAt: '2026-01-01T00:00:00.000Z',
        appVersion: '0.0.1',
        entities: {
          travels: [
            {
              ...baseEntityFields('travel-1'),
              title: 'Future Trip',
              dates: { start: '2026-06-01', end: '2026-06-10' },
              status: 'planning',
            },
          ],
          destinations: [],
          hotels: [],
          transports: [],
          documents: [],
          expenses: [],
          checklists: [],
          checklistItems: [],
          notifications: [],
        },
      };

      const service = configureService({});

      await expectAsync(service.import(zipManifest(manifest))).toBeRejectedWithError(
        TripArchiveImportError,
        /Unsupported schemaVersion 999/,
      );
    });

    it('accepts a schemaVersion equal to the current version (does not reject)', async () => {
      const manifest = {
        schemaVersion: 2,
        exportedAt: '2026-01-01T00:00:00.000Z',
        appVersion: '0.0.1',
        entities: {
          travels: [
            {
              ...baseEntityFields('travel-1'),
              title: 'Current Trip',
              dates: { start: '2026-06-01', end: '2026-06-10' },
              status: 'planning',
            },
          ],
          destinations: [],
          hotels: [],
          transports: [],
          documents: [],
          expenses: [],
          checklists: [],
          checklistItems: [],
          notifications: [],
        },
      };

      const service = configureService({});

      await expectAsync(service.import(zipManifest(manifest))).toBeResolved();
    });

    it('accepts a schemaVersion lower than the current version (v1 archive)', async () => {
      const manifest = {
        schemaVersion: 1,
        exportedAt: '2025-01-01T00:00:00.000Z',
        appVersion: '0.0.1',
        entities: {
          travels: [
            {
              ...baseEntityFields('travel-1'),
              title: 'Old Trip',
              dates: { start: '2025-06-01', end: '2025-06-10' },
              status: 'completed',
            },
          ],
          destinations: [],
          hotels: [],
          documents: [],
          expenses: [],
          checklists: [],
          checklistItems: [],
          notifications: [],
        },
      };

      const service = configureService({});

      await expectAsync(service.import(zipManifest(manifest))).toBeResolved();
    });
  });

  describe('export -> import round-trip (v2, with transports)', () => {
    it('is lossless for a full manifest and rewrites foreign keys with referential integrity preserved', async () => {
      const travelId = 'travel-1';
      const destinationId = 'destination-1';
      const transportId = 'transport-1';
      const documentId = 'document-1';
      const blobId = 'blob-1';

      const travel: Travel = {
        ...baseEntityFields(travelId),
        title: 'Kyoto Trip',
        dates: { start: '2026-03-14', end: '2026-03-18' },
        status: 'planning',
      };
      const destination: Destination = {
        ...baseEntityFields(destinationId),
        travelId,
        name: 'Kyoto',
        arrival: '2026-03-14',
        departure: '2026-03-18',
        order: 0,
      };
      const transport: Transport = {
        ...baseEntityFields(transportId),
        destinationId,
        type: 'flight',
        bookingUrl: 'https://airline.example/booking/abc123',
        company: 'ANA',
      };
      const blob = new Blob(['reservation contents'], { type: 'application/pdf' });
      const document: TravelDocument = {
        ...baseEntityFields(documentId),
        travelId,
        entityRef: { type: 'transport', id: transportId },
        title: 'Flight reservation',
        category: 'flights',
        fileName: 'reservation.pdf',
        mimeType: 'application/pdf',
        sizeBytes: blob.size,
        blobId,
      };

      const exportService = configureService({
        travel,
        destinations: [destination],
        transports: [transport],
        documents: [document],
        documentBlobs: new Map([[blobId, blob]]),
      });

      const archive = await exportService.export(travelId);

      // The exported manifest itself must include the transport (v2 shape).
      const exportedManifest = (await readManifest(archive)) as {
        schemaVersion: number;
        entities: { transports: Transport[] };
      };
      expect(exportedManifest.schemaVersion).toBe(2);
      expect(exportedManifest.entities.transports.length).toBe(1);
      expect(exportedManifest.entities.transports[0]?.id).toBe(transportId);

      const importStorage = new FakeStorageProvider();
      const importService = configureService({ storage: importStorage });

      const newTravelId = await importService.import(archive);

      expect(newTravelId).not.toBe(travelId);

      const importedTransports = await importStorage.getAll<Transport>('transports');
      const importedDestinations = await importStorage.getAll<Destination>('destinations');
      const importedDocuments = await importStorage.getAll<TravelDocument>('documents');

      expect(importedTransports.length).toBe(1);
      expect(importedDestinations.length).toBe(1);
      expect(importedDocuments.length).toBe(1);

      const newTransport = importedTransports[0];
      const newDestination = importedDestinations[0];
      const newDocument = importedDocuments[0];
      if (!newTransport || !newDestination || !newDocument) {
        throw new Error('expected exactly one imported transport/destination/document');
      }

      // Foreign keys are rewritten to brand-new uuids...
      expect(newTransport.id).not.toBe(transportId);
      expect(newDestination.id).not.toBe(destinationId);
      expect(newDocument.id).not.toBe(documentId);

      // ...while referential integrity across the rewritten ids is preserved.
      expect(newTransport.destinationId).toBe(newDestination.id);
      expect(newDocument.entityRef?.id).toBe(newTransport.id);
      expect(newDestination.travelId).toBe(newTravelId);
      expect(newDocument.travelId).toBe(newTravelId);

      // Non-key fields survive the round trip losslessly.
      expect(newTransport.type).toBe('flight');
      expect(newTransport.bookingUrl).toBe(transport.bookingUrl);
      expect(newTransport.company).toBe('ANA');

      // A fresh blob was written under a new blobId, reachable via the document.
      const newBlob = await importStorage.blobs.get(newDocument.blobId);
      expect(newBlob).toBeDefined();
      expect(newDocument.blobId).not.toBe(blobId);
    });
  });
});
