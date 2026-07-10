import { Injectable, inject, signal } from '@angular/core';

import { HOTEL_REPOSITORY } from '../../core/di/repository.tokens';
import type { Hotel } from '../../domain/entities/hotel';
import type { GeoLocation } from '../../domain/value-objects/geo-location';
import type { Money } from '../../domain/value-objects/money';
import { createBaseEntityFields, touchTimestamps } from '../shared/base-entity.factory';
import { toErrorMessage } from '../shared/error.util';

/** Fields required to create a new Hotel (Lodging) entry; `BaseEntity` fields are generated. */
export interface NewHotelInput {
  destinationId: string;
  name: string;
  checkIn: string;
  checkOut: string;
  address?: string;
  phone?: string;
  email?: string;
  web?: string;
  confirmationCode?: string;
  price?: Money;
  geo?: GeoLocation;
  notes?: string;
  mapsUrl?: string;
}

/**
 * Use-case service for Lodging (MVP — design §5). Ordered by `checkIn` so
 * the Destinations timeline can render lodging chronologically.
 */
@Injectable({ providedIn: 'root' })
export class HotelService {
  private readonly repo = inject(HOTEL_REPOSITORY);

  readonly hotels = signal<Hotel[]>([]);
  readonly error = signal<string | null>(null);

  async load(destinationId: string): Promise<void> {
    try {
      this.hotels.set(await this.listFor(destinationId));
    } catch (err) {
      this.error.set(toErrorMessage(err));
    }
  }

  /**
   * Reads Hotels for a single Destination WITHOUT touching the shared
   * `hotels` signal — used by read-only aggregations (Destinations
   * timeline lodging line, Itinerary, Today) that need lodging for
   * multiple destinations at once without clobbering each other's state.
   */
  async listFor(destinationId: string): Promise<Hotel[]> {
    try {
      const list = await this.repo.getByDestination(destinationId);
      return [...list].sort(
        (a, b) => new Date(a.checkIn).getTime() - new Date(b.checkIn).getTime(),
      );
    } catch (err) {
      this.error.set(toErrorMessage(err));
      return [];
    }
  }

  async create(input: NewHotelInput): Promise<Hotel | undefined> {
    try {
      const hotel: Hotel = { ...createBaseEntityFields(), ...input };
      await this.repo.save(hotel);
      await this.load(input.destinationId);
      return hotel;
    } catch (err) {
      this.error.set(toErrorMessage(err));
      return undefined;
    }
  }

  async update(hotel: Hotel, changes: Partial<NewHotelInput>): Promise<void> {
    try {
      const updated: Hotel = { ...hotel, ...changes, ...touchTimestamps() };
      await this.repo.save(updated);
      await this.load(updated.destinationId);
    } catch (err) {
      this.error.set(toErrorMessage(err));
    }
  }

  async softDelete(id: string, destinationId: string): Promise<void> {
    try {
      await this.repo.softDelete(id);
      await this.load(destinationId);
    } catch (err) {
      this.error.set(toErrorMessage(err));
    }
  }
}
