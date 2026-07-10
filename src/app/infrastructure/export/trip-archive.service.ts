import { inject, Injectable } from '@angular/core';
import { strFromU8, strToU8, unzip, zip, type Zippable } from 'fflate';

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
import type { TripArchive } from '../../domain/repositories/trip-archive';
import { ChecklistItemMapper } from '../persistence/indexeddb/mappers/checklist-item.mapper';
import { ChecklistMapper } from '../persistence/indexeddb/mappers/checklist.mapper';
import { DestinationMapper } from '../persistence/indexeddb/mappers/destination.mapper';
import { DocumentMapper } from '../persistence/indexeddb/mappers/document.mapper';
import { ExpenseMapper } from '../persistence/indexeddb/mappers/expense.mapper';
import { HotelMapper } from '../persistence/indexeddb/mappers/hotel.mapper';
import { NotificationMapper } from '../persistence/indexeddb/mappers/notification.mapper';
import { TransportMapper } from '../persistence/indexeddb/mappers/transport.mapper';
import { TravelMapper } from '../persistence/indexeddb/mappers/travel.mapper';

/**
 * MVP manifest schema version. Bumping this is a breaking change to the
 * export format and requires import-side migration or rejection
 * (design §10). v2 (destination-logistics) adds `entities.transports`;
 * importing a v1 archive (no `transports` key) is explicitly backward
 * compatible — see `import()`.
 */
const SCHEMA_VERSION = 2;
const APP_VERSION = '0.0.1';

interface TripManifest {
  schemaVersion: number;
  exportedAt: string;
  appVersion: string;
  entities: {
    travels: Travel[];
    destinations: Destination[];
    hotels: Hotel[];
    /** Optional for backward compatibility with v1 archives (no transports key). */
    transports?: Transport[];
    documents: TravelDocument[];
    expenses: Expense[];
    checklists: Checklist[];
    checklistItems: ChecklistItem[];
    notifications: Notification[];
  };
}

/** Thrown when an imported archive fails validation (design §15). */
export class TripArchiveImportError extends Error {}

/**
 * Concrete `TripArchive` implementation using `fflate` (design §10). This
 * is the ONLY file allowed to import `fflate` — enforced by
 * dependency-cruiser's `fflate-only-in-export` rule. Provided only via
 * `provideDataLayer()`'s `TRIP_ARCHIVE` binding; depends on the same
 * repository tokens the application layer uses (never a concrete class).
 */
@Injectable()
export class TripArchiveService implements TripArchive {
  private readonly travelMapper = new TravelMapper();
  private readonly destinationMapper = new DestinationMapper();
  private readonly hotelMapper = new HotelMapper();
  private readonly transportMapper = new TransportMapper();
  private readonly documentMapper = new DocumentMapper();
  private readonly expenseMapper = new ExpenseMapper();
  private readonly checklistMapper = new ChecklistMapper();
  private readonly checklistItemMapper = new ChecklistItemMapper();
  private readonly notificationMapper = new NotificationMapper();

  private readonly storage = inject(STORAGE_PROVIDER);
  private readonly travelRepo = inject(TRAVEL_REPOSITORY);
  private readonly destinationRepo = inject(DESTINATION_REPOSITORY);
  private readonly hotelRepo = inject(HOTEL_REPOSITORY);
  private readonly transportRepo = inject(TRANSPORT_REPOSITORY);
  private readonly documentRepo = inject(DOCUMENT_REPOSITORY);
  private readonly expenseRepo = inject(EXPENSE_REPOSITORY);
  private readonly checklistRepo = inject(CHECKLIST_REPOSITORY);
  private readonly notificationRepo = inject(NOTIFICATION_REPOSITORY);

  async export(travelId: string): Promise<Blob> {
    const travel = await this.travelRepo.getById(travelId);
    if (!travel) {
      throw new TripArchiveImportError(`Travel ${travelId} not found`);
    }

    const destinations = await this.destinationRepo.getByTravel(travelId);
    const hotelLists = await Promise.all(
      destinations.map((d) => this.hotelRepo.getByDestination(d.id)),
    );
    const hotels: Hotel[] = hotelLists.flat();
    const transportLists = await Promise.all(
      destinations.map((d) => this.transportRepo.getByDestination(d.id)),
    );
    const transports: Transport[] = transportLists.flat();
    const documents = await this.documentRepo.getByTravel(travelId);
    const expenses = await this.expenseRepo.getByTravel(travelId);
    const checklists = await this.checklistRepo.getByTravel(travelId);
    const checklistItemLists = await Promise.all(
      checklists.map((c) => this.checklistRepo.getItems(c.id)),
    );
    const checklistItems: ChecklistItem[] = ([] as ChecklistItem[]).concat(...checklistItemLists);
    const notifications = await this.notificationRepo.getByTravel(travelId);

    const manifest: TripManifest = {
      schemaVersion: SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      appVersion: APP_VERSION,
      entities: {
        travels: [travel],
        destinations,
        hotels,
        transports,
        documents,
        expenses,
        checklists,
        checklistItems,
        notifications,
      },
    };

    const zippable: Zippable = {
      'manifest.json': strToU8(JSON.stringify(manifest)),
    };

    for (const doc of documents) {
      const blob = await this.documentRepo.getBlob(doc.id);
      if (!blob) continue;
      const extension = extensionFromFileName(doc.fileName);
      const buffer = await blob.arrayBuffer();
      zippable[`assets/${doc.blobId}${extension}`] = new Uint8Array(buffer);
    }

    const zipped = await zipAsync(zippable);
    return new Blob([zipped as BlobPart], { type: 'application/zip' });
  }

  async import(archive: Blob): Promise<string> {
    const buffer = new Uint8Array(await archive.arrayBuffer());
    const files = await unzipAsync(buffer);

    const manifestBytes = files['manifest.json'];
    if (!manifestBytes) {
      throw new TripArchiveImportError('Archive is missing manifest.json');
    }
    const manifest = JSON.parse(strFromU8(manifestBytes)) as TripManifest;
    // Backward compatibility: a v1 archive (no `entities.transports` key) is
    // a strict subset of v2 and imports cleanly — only reject versions newer
    // than what this app understands.
    if (manifest.schemaVersion > SCHEMA_VERSION) {
      throw new TripArchiveImportError(
        `Unsupported schemaVersion ${manifest.schemaVersion}; expected at most ${SCHEMA_VERSION}`,
      );
    }

    const idMap = new Map<string, string>();
    const remapId = (oldId: string): string => {
      let newId = idMap.get(oldId);
      if (!newId) {
        newId = crypto.randomUUID();
        idMap.set(oldId, newId);
      }
      return newId;
    };

    const now = new Date().toISOString();
    const freshen = <
      T extends {
        id: string;
        createdAt: string;
        updatedAt: string;
        deletedAt: string | null;
        syncStatus: string;
        lastModified: string;
      },
    >(
      entity: T,
      newId: string,
    ): T => ({
      ...entity,
      id: newId,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      syncStatus: 'local',
      lastModified: now,
    });

    const [sourceTravel] = manifest.entities.travels;
    if (!sourceTravel) {
      throw new TripArchiveImportError('Archive contains no travel entity');
    }
    const newTravelId = remapId(sourceTravel.id);
    const newTravel: Travel = freshen(sourceTravel, newTravelId);

    const newDestinations: Destination[] = manifest.entities.destinations.map((d) =>
      freshen({ ...d, travelId: newTravelId }, remapId(d.id)),
    );
    const newHotels: Hotel[] = manifest.entities.hotels.map((h) =>
      freshen({ ...h, destinationId: remapId(h.destinationId) }, remapId(h.id)),
    );
    // `entities.transports` is missing on v1 archives — treat as empty
    // (backward-compatible import, design §"Migration / Rollout").
    const newTransports: Transport[] = (manifest.entities.transports ?? []).map((t) =>
      freshen({ ...t, destinationId: remapId(t.destinationId) }, remapId(t.id)),
    );
    const newExpenses: Expense[] = manifest.entities.expenses.map((e) =>
      freshen(
        {
          ...e,
          travelId: newTravelId,
          ...(e.destinationId ? { destinationId: remapId(e.destinationId) } : {}),
        },
        remapId(e.id),
      ),
    );
    const newChecklists: Checklist[] = manifest.entities.checklists.map((c) =>
      freshen({ ...c, travelId: newTravelId }, remapId(c.id)),
    );
    const newChecklistItems: ChecklistItem[] = manifest.entities.checklistItems.map((i) =>
      freshen({ ...i, checklistId: remapId(i.checklistId) }, remapId(i.id)),
    );
    const newNotifications: Notification[] = manifest.entities.notifications.map((n) =>
      freshen(
        {
          ...n,
          travelId: newTravelId,
          ...(n.entityRef ? { entityRef: { ...n.entityRef, id: remapId(n.entityRef.id) } } : {}),
        },
        remapId(n.id),
      ),
    );

    const newDocuments: TravelDocument[] = [];
    const blobWrites: Array<{ blobId: string; blob: Blob }> = [];
    for (const doc of manifest.entities.documents) {
      const newBlobId = crypto.randomUUID();
      const extension = extensionFromFileName(doc.fileName);
      const assetBytes = files[`assets/${doc.blobId}${extension}`];
      if (assetBytes) {
        blobWrites.push({
          blobId: newBlobId,
          blob: new Blob([assetBytes as BlobPart], { type: doc.mimeType }),
        });
      }
      const remapped = freshen(
        {
          ...doc,
          travelId: newTravelId,
          blobId: newBlobId,
          ...(doc.entityRef
            ? { entityRef: { ...doc.entityRef, id: remapId(doc.entityRef.id) } }
            : {}),
        },
        remapId(doc.id),
      );
      newDocuments.push(remapped);
    }

    await this.storage.transaction(
      [
        'travels',
        'destinations',
        'hotels',
        'transports',
        'documents',
        'expenses',
        'checklists',
        'checklistItems',
        'notifications',
      ],
      async () => {
        for (const { blobId, blob } of blobWrites) {
          await this.storage.blobs.put(blobId, blob);
        }
        await this.storage.put('travels', this.travelMapper.toRecord(newTravel));
        await this.storage.bulkPut(
          'destinations',
          newDestinations.map((d) => this.destinationMapper.toRecord(d)),
        );
        await this.storage.bulkPut(
          'hotels',
          newHotels.map((h) => this.hotelMapper.toRecord(h)),
        );
        await this.storage.bulkPut(
          'transports',
          newTransports.map((t) => this.transportMapper.toRecord(t)),
        );
        await this.storage.bulkPut(
          'documents',
          newDocuments.map((d) => this.documentMapper.toRecord(d)),
        );
        await this.storage.bulkPut(
          'expenses',
          newExpenses.map((e) => this.expenseMapper.toRecord(e)),
        );
        await this.storage.bulkPut(
          'checklists',
          newChecklists.map((c) => this.checklistMapper.toRecord(c)),
        );
        await this.storage.bulkPut(
          'checklistItems',
          newChecklistItems.map((i) => this.checklistItemMapper.toRecord(i)),
        );
        await this.storage.bulkPut(
          'notifications',
          newNotifications.map((n) => this.notificationMapper.toRecord(n)),
        );
      },
    );

    return newTravelId;
  }
}

function extensionFromFileName(fileName: string): string {
  const lastDot = fileName.lastIndexOf('.');
  return lastDot === -1 ? '' : fileName.slice(lastDot);
}

function zipAsync(data: Zippable): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    zip(data, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}

function unzipAsync(data: Uint8Array): Promise<Record<string, Uint8Array>> {
  return new Promise((resolve, reject) => {
    unzip(data, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}
