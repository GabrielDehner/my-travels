import { Injectable, inject, signal } from '@angular/core';

import { DESTINATION_REPOSITORY } from '../../core/di/repository.tokens';
import type { Destination } from '../../domain/entities/destination';
import type { GeoLocation } from '../../domain/value-objects/geo-location';
import { createBaseEntityFields, touchTimestamps } from '../shared/base-entity.factory';
import { toErrorMessage } from '../shared/error.util';

/** Fields required to create a new Destination; `BaseEntity` fields are generated. */
export interface NewDestinationInput {
  travelId: string;
  name: string;
  arrival: string;
  departure: string;
  country?: string;
  countryCode?: string;
  city?: string;
  geo?: GeoLocation;
  notes?: string;
}

/**
 * Use-case service for Destinations, kept in chronological (`order`) order
 * to feed the Destinations timeline and Itinerary (design §5, §13, §14).
 */
@Injectable({ providedIn: 'root' })
export class DestinationService {
  private readonly repo = inject(DESTINATION_REPOSITORY);

  readonly destinations = signal<Destination[]>([]);
  readonly error = signal<string | null>(null);

  async load(travelId: string): Promise<void> {
    try {
      const list = await this.repo.getByTravel(travelId);
      this.destinations.set([...list].sort((a, b) => a.order - b.order));
    } catch (err) {
      this.error.set(toErrorMessage(err));
    }
  }

  async create(input: NewDestinationInput): Promise<Destination | undefined> {
    try {
      const order = this.destinations().length;
      const destination: Destination = { ...createBaseEntityFields(), ...input, order };
      await this.repo.save(destination);
      await this.load(input.travelId);
      return destination;
    } catch (err) {
      this.error.set(toErrorMessage(err));
      return undefined;
    }
  }

  async update(destination: Destination, changes: Partial<NewDestinationInput>): Promise<void> {
    try {
      const updated: Destination = { ...destination, ...changes, ...touchTimestamps() };
      await this.repo.save(updated);
      await this.load(updated.travelId);
    } catch (err) {
      this.error.set(toErrorMessage(err));
    }
  }

  async softDelete(id: string, travelId: string): Promise<void> {
    try {
      await this.repo.softDelete(id);
      await this.load(travelId);
    } catch (err) {
      this.error.set(toErrorMessage(err));
    }
  }
}
