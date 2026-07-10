import { inject, Injectable } from '@angular/core';

import { STORAGE_PROVIDER } from '../../../../core/di/storage.tokens';
import type { Hotel } from '../../../../domain/entities/hotel';
import type { HotelRepository } from '../../../../domain/repositories/hotel.repository';
import type { QuerySpec } from '../../../../domain/shared/query-spec';
import { HotelMapper } from '../mappers/hotel.mapper';
import type { HotelRecord } from '../records/hotel.record';

/**
 * Dexie-backed `HotelRepository` implementation (MVP — design §7). Provided
 * only via `provideDataLayer()`'s `HOTEL_REPOSITORY` binding.
 */
@Injectable()
export class IndexedDBHotelRepository implements HotelRepository {
  private readonly mapper = new HotelMapper();
  private readonly storage = inject(STORAGE_PROVIDER);

  async getByDestination(destinationId: string): Promise<Hotel[]> {
    const records = await this.storage.getAll<HotelRecord>('hotels');
    return records
      .filter((r) => r.destinationId === destinationId && r.deletedAt === null)
      .map((r) => this.mapper.toEntity(r));
  }

  async save(hotel: Hotel): Promise<void> {
    await this.storage.put('hotels', this.mapper.toRecord(hotel));
  }

  async softDelete(id: string): Promise<void> {
    const record = await this.storage.getById<HotelRecord>('hotels', id);
    if (!record) return;
    const now = new Date().toISOString();
    await this.storage.put('hotels', { ...record, deletedAt: now, lastModified: now });
  }

  async query(spec: QuerySpec<Hotel>): Promise<Hotel[]> {
    const records = await this.storage.query<HotelRecord>('hotels', spec as QuerySpec<HotelRecord>);
    return records.filter((r) => r.deletedAt === null).map((r) => this.mapper.toEntity(r));
  }
}
