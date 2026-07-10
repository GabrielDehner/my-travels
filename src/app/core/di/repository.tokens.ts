import { InjectionToken } from '@angular/core';

import type { ChecklistRepository } from '../../domain/repositories/checklist.repository';
import type { DestinationRepository } from '../../domain/repositories/destination.repository';
import type { DocumentRepository } from '../../domain/repositories/document.repository';
import type { ExpenseRepository } from '../../domain/repositories/expense.repository';
import type { HotelRepository } from '../../domain/repositories/hotel.repository';
import type { NotificationRepository } from '../../domain/repositories/notification.repository';
import type { TransportRepository } from '../../domain/repositories/transport.repository';
import type { TravelRepository } from '../../domain/repositories/travel.repository';
import type { TripArchive } from '../../domain/repositories/trip-archive';

/**
 * One InjectionToken per domain repository port + the TripArchive port
 * (design §5). These tokens are the ONLY thing the application layer is
 * allowed to inject to reach persistence — never a concrete infrastructure
 * class directly. Bindings live in `providers.ts` (the v2 swap point).
 */
export const TRAVEL_REPOSITORY = new InjectionToken<TravelRepository>('TRAVEL_REPOSITORY');
export const DESTINATION_REPOSITORY = new InjectionToken<DestinationRepository>(
  'DESTINATION_REPOSITORY',
);
export const HOTEL_REPOSITORY = new InjectionToken<HotelRepository>('HOTEL_REPOSITORY');
export const TRANSPORT_REPOSITORY = new InjectionToken<TransportRepository>(
  'TRANSPORT_REPOSITORY',
);
export const DOCUMENT_REPOSITORY = new InjectionToken<DocumentRepository>('DOCUMENT_REPOSITORY');
export const EXPENSE_REPOSITORY = new InjectionToken<ExpenseRepository>('EXPENSE_REPOSITORY');
export const CHECKLIST_REPOSITORY = new InjectionToken<ChecklistRepository>('CHECKLIST_REPOSITORY');
export const NOTIFICATION_REPOSITORY = new InjectionToken<NotificationRepository>(
  'NOTIFICATION_REPOSITORY',
);
export const TRIP_ARCHIVE = new InjectionToken<TripArchive>('TRIP_ARCHIVE');
