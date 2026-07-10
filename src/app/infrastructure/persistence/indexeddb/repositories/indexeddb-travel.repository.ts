import { inject, Injectable } from '@angular/core';

import { STORAGE_PROVIDER } from '../../../../core/di/storage.tokens';
import type { Travel } from '../../../../domain/entities/travel';
import type { TravelRepository } from '../../../../domain/repositories/travel.repository';
import type { QuerySpec } from '../../../../domain/shared/query-spec';
import { TravelMapper } from '../mappers/travel.mapper';
import type { TravelRecord } from '../records/travel.record';

/**
 * Dexie-backed `TravelRepository` implementation (design §7). Reads
 * exclude soft-deleted records; `softDelete` sets `deletedAt`/`lastModified`
 * and writes the record back (no physical delete in MVP). Provided only via
 * `provideDataLayer()`'s `TRAVEL_REPOSITORY` binding (no `providedIn: 'root'`)
 * so the DI token is the single path to this class — the v2 swap point.
 */
@Injectable()
export class IndexedDBTravelRepository implements TravelRepository {
  private readonly mapper = new TravelMapper();
  private readonly storage = inject(STORAGE_PROVIDER);

  async getById(id: string): Promise<Travel | undefined> {
    const record = await this.storage.getById<TravelRecord>('travels', id);
    if (!record || record.deletedAt !== null) return undefined;
    return this.mapper.toEntity(record);
  }

  async getAll(): Promise<Travel[]> {
    const records = await this.storage.getAll<TravelRecord>('travels');
    return records.filter((r) => r.deletedAt === null).map((r) => this.mapper.toEntity(r));
  }

  async save(travel: Travel): Promise<void> {
    await this.storage.put('travels', this.mapper.toRecord(travel));
  }

  async softDelete(id: string): Promise<void> {
    const record = await this.storage.getById<TravelRecord>('travels', id);
    if (!record) return;
    const now = new Date().toISOString();
    await this.storage.put('travels', { ...record, deletedAt: now, lastModified: now });
  }

  async query(spec: QuerySpec<Travel>): Promise<Travel[]> {
    const records = await this.storage.query<TravelRecord>(
      'travels',
      spec as QuerySpec<TravelRecord>,
    );
    return records.filter((r) => r.deletedAt === null).map((r) => this.mapper.toEntity(r));
  }

  async saveCoverImage(travelId: string, blob: Blob): Promise<string> {
    const coverImageId = `cover-${travelId}`;
    await this.storage.blobs.put(coverImageId, blob);
    return coverImageId;
  }

  async getCoverImage(coverImageId: string): Promise<Blob | undefined> {
    return this.storage.blobs.get(coverImageId);
  }
}
