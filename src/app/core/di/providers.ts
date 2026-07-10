import type { Provider } from '@angular/core';

import { TripArchiveService } from '../../infrastructure/export/trip-archive.service';
import { IndexedDBStorageProvider } from '../../infrastructure/persistence/indexeddb/indexeddb-storage-provider';
import { IndexedDBChecklistRepository } from '../../infrastructure/persistence/indexeddb/repositories/indexeddb-checklist.repository';
import { IndexedDBDestinationRepository } from '../../infrastructure/persistence/indexeddb/repositories/indexeddb-destination.repository';
import { IndexedDBDocumentRepository } from '../../infrastructure/persistence/indexeddb/repositories/indexeddb-document.repository';
import { IndexedDBExpenseRepository } from '../../infrastructure/persistence/indexeddb/repositories/indexeddb-expense.repository';
import { IndexedDBHotelRepository } from '../../infrastructure/persistence/indexeddb/repositories/indexeddb-hotel.repository';
import { IndexedDBNotificationRepository } from '../../infrastructure/persistence/indexeddb/repositories/indexeddb-notification.repository';
import { IndexedDBTransportRepository } from '../../infrastructure/persistence/indexeddb/repositories/indexeddb-transport.repository';
import { IndexedDBTravelRepository } from '../../infrastructure/persistence/indexeddb/repositories/indexeddb-travel.repository';

import {
  CHECKLIST_REPOSITORY,
  DESTINATION_REPOSITORY,
  DOCUMENT_REPOSITORY,
  EXPENSE_REPOSITORY,
  HOTEL_REPOSITORY,
  NOTIFICATION_REPOSITORY,
  TRANSPORT_REPOSITORY,
  TRAVEL_REPOSITORY,
  TRIP_ARCHIVE,
} from './repository.tokens';
import { STORAGE_PROVIDER } from './storage.tokens';

/**
 * Binds every domain port token to its concrete IndexedDB implementation
 * (design §5, §7). This function is the ONLY place interface-to-
 * implementation bindings exist for the data layer.
 *
 * v2 SWAP POINT — rebind to Api* implementations here; nothing else changes.
 */
export function provideDataLayer(): Provider[] {
  return [
    { provide: STORAGE_PROVIDER, useClass: IndexedDBStorageProvider },
    { provide: TRAVEL_REPOSITORY, useClass: IndexedDBTravelRepository },
    { provide: DESTINATION_REPOSITORY, useClass: IndexedDBDestinationRepository },
    { provide: HOTEL_REPOSITORY, useClass: IndexedDBHotelRepository },
    { provide: TRANSPORT_REPOSITORY, useClass: IndexedDBTransportRepository },
    { provide: DOCUMENT_REPOSITORY, useClass: IndexedDBDocumentRepository },
    { provide: EXPENSE_REPOSITORY, useClass: IndexedDBExpenseRepository },
    { provide: CHECKLIST_REPOSITORY, useClass: IndexedDBChecklistRepository },
    { provide: NOTIFICATION_REPOSITORY, useClass: IndexedDBNotificationRepository },
    { provide: TRIP_ARCHIVE, useClass: TripArchiveService },
  ];
}
