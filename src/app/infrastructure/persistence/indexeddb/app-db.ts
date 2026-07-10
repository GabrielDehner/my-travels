import Dexie, { type Table } from 'dexie';

import type { ChecklistItemRecord } from './records/checklist-item.record';
import type { ChecklistRecord } from './records/checklist.record';
import type { DestinationRecord } from './records/destination.record';
import type { DocumentRecord } from './records/document.record';
import type { ExpenseRecord } from './records/expense.record';
import type { HotelRecord } from './records/hotel.record';
import type { NotificationRecord } from './records/notification.record';
import type { TransportRecord } from './records/transport.record';
import type { TravelRecord } from './records/travel.record';

/**
 * Persisted binary payload for a `documents` record, keyed by `blobId`
 * (design §8, §9). Kept in its own store so metadata queries never
 * deserialize binary data.
 */
export interface DocumentBlobRecord {
  id: string;
  blob: Blob;
}

/**
 * Dexie subclass declaring the v1 object-store schema (design §8). This is
 * the ONLY file (together with siblings in this folder) allowed to import
 * `dexie` — enforced by dependency-cruiser's `dexie-only-in-indexeddb` rule.
 */
export class AppDb extends Dexie {
  travels!: Table<TravelRecord, string>;
  destinations!: Table<DestinationRecord, string>;
  hotels!: Table<HotelRecord, string>;
  transports!: Table<TransportRecord, string>;
  documents!: Table<DocumentRecord, string>;
  documentBlobs!: Table<DocumentBlobRecord, string>;
  expenses!: Table<ExpenseRecord, string>;
  checklists!: Table<ChecklistRecord, string>;
  checklistItems!: Table<ChecklistItemRecord, string>;
  notifications!: Table<NotificationRecord, string>;

  constructor() {
    super('my-travels');
    this.version(1).stores({
      travels: 'id, updatedAt, deletedAt',
      destinations: 'id, travelId, order, deletedAt',
      hotels: 'id, destinationId, deletedAt',
      documents: 'id, travelId, category, deletedAt',
      documentBlobs: 'id',
      expenses: 'id, travelId, date, deletedAt',
      checklists: 'id, travelId, deletedAt',
      checklistItems: 'id, checklistId, order, deletedAt',
      notifications: 'id, travelId, triggerAt, fired, deletedAt',
    });
    // v2 — ADDITIVE migration (destination-logistics design). Adds the
    // `transports` store; the v1 block above is intentionally untouched so
    // existing user data opens cleanly on upgrade.
    this.version(2).stores({
      transports: 'id, destinationId, deletedAt',
    });
  }
}
