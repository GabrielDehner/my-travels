import { Injectable, inject, signal } from '@angular/core';

import { TRAVEL_REPOSITORY } from '../../core/di/repository.tokens';
import type { Travel } from '../../domain/entities/travel';
import type { TravelStatus } from '../../domain/enums/travel-status';
import type { DateRange } from '../../domain/value-objects/date-range';
import { createBaseEntityFields, touchTimestamps } from '../shared/base-entity.factory';
import { toErrorMessage } from '../shared/error.util';

/** Fields required to create a new Travel; `BaseEntity` fields are generated. */
export interface NewTravelInput {
  title: string;
  dates: DateRange;
  status: TravelStatus;
  description?: string;
  coverImageId?: string;
  color?: string;
  notes?: string;
}

/**
 * Use-case service for Travel (Trip) CRUD, exposing Signals to Presentation
 * (design §5, §14). Injects the `TRAVEL_REPOSITORY` port token only — never
 * a concrete infrastructure class.
 */
@Injectable({ providedIn: 'root' })
export class TravelService {
  private readonly repo = inject(TRAVEL_REPOSITORY);

  readonly trips = signal<Travel[]>([]);
  readonly activeTrip = signal<Travel | null>(null);
  readonly error = signal<string | null>(null);

  async load(): Promise<void> {
    try {
      const trips = await this.repo.getAll();
      this.trips.set(trips);
      this.error.set(null);
    } catch (err) {
      this.error.set(toErrorMessage(err));
    }
  }

  async create(input: NewTravelInput): Promise<Travel | undefined> {
    try {
      const travel: Travel = { ...createBaseEntityFields(), ...input };
      await this.repo.save(travel);
      await this.load();
      return travel;
    } catch (err) {
      this.error.set(toErrorMessage(err));
      return undefined;
    }
  }

  async update(travel: Travel, changes: Partial<NewTravelInput>): Promise<void> {
    try {
      const updated: Travel = { ...travel, ...changes, ...touchTimestamps() };
      await this.repo.save(updated);
      await this.load();
      if (this.activeTrip()?.id === updated.id) this.activeTrip.set(updated);
    } catch (err) {
      this.error.set(toErrorMessage(err));
    }
  }

  async softDelete(id: string): Promise<void> {
    try {
      await this.repo.softDelete(id);
      await this.load();
      if (this.activeTrip()?.id === id) this.activeTrip.set(null);
    } catch (err) {
      this.error.set(toErrorMessage(err));
    }
  }

  setActive(travel: Travel | null): void {
    this.activeTrip.set(travel);
  }

  /**
   * Stores a cover photo for a trip and links it via `coverImageId` (global
   * aesthetic polish — real cover images, design §C2). Uses the same
   * repository-owned blob seam as Document uploads; presentation never
   * touches `StorageProvider` directly.
   */
  async setCoverImage(travel: Travel, blob: Blob): Promise<void> {
    try {
      const coverImageId = await this.repo.saveCoverImage(travel.id, blob);
      await this.update(travel, { coverImageId });
    } catch (err) {
      this.error.set(toErrorMessage(err));
    }
  }

  /** Resolves a trip's cover photo as a revocable object URL, or `undefined` if none is set. */
  async getCoverImageUrl(travel: Travel): Promise<string | undefined> {
    if (!travel.coverImageId) return undefined;
    try {
      const blob = await this.repo.getCoverImage(travel.coverImageId);
      return blob ? URL.createObjectURL(blob) : undefined;
    } catch (err) {
      this.error.set(toErrorMessage(err));
      return undefined;
    }
  }
}
