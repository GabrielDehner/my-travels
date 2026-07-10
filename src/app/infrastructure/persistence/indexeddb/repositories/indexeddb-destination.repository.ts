import { inject, Injectable } from '@angular/core';

import { STORAGE_PROVIDER } from '../../../../core/di/storage.tokens';
import type { Destination } from '../../../../domain/entities/destination';
import type { DestinationRepository } from '../../../../domain/repositories/destination.repository';
import type { QuerySpec } from '../../../../domain/shared/query-spec';
import { DestinationMapper } from '../mappers/destination.mapper';
import type { DestinationRecord } from '../records/destination.record';

/**
 * Dexie-backed `DestinationRepository` implementation (design §7). Provided
 * only via `provideDataLayer()`'s `DESTINATION_REPOSITORY` binding.
 */
@Injectable()
export class IndexedDBDestinationRepository implements DestinationRepository {
  private readonly mapper = new DestinationMapper();
  private readonly storage = inject(STORAGE_PROVIDER);

  async getByTravel(travelId: string): Promise<Destination[]> {
    const records = await this.storage.getAll<DestinationRecord>('destinations');
    return records
      .filter((r) => r.travelId === travelId && r.deletedAt === null)
      .map((r) => this.mapper.toEntity(r));
  }

  async save(destination: Destination): Promise<void> {
    await this.storage.put('destinations', this.mapper.toRecord(destination));
  }

  async softDelete(id: string): Promise<void> {
    const record = await this.storage.getById<DestinationRecord>('destinations', id);
    if (!record) return;
    const now = new Date().toISOString();
    await this.storage.put('destinations', { ...record, deletedAt: now, lastModified: now });
  }

  async query(spec: QuerySpec<Destination>): Promise<Destination[]> {
    const records = await this.storage.query<DestinationRecord>(
      'destinations',
      spec as QuerySpec<DestinationRecord>,
    );
    return records.filter((r) => r.deletedAt === null).map((r) => this.mapper.toEntity(r));
  }
}
