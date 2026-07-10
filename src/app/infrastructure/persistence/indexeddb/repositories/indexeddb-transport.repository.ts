import { inject, Injectable } from '@angular/core';

import { STORAGE_PROVIDER } from '../../../../core/di/storage.tokens';
import type { Transport } from '../../../../domain/entities/transport';
import type { TransportRepository } from '../../../../domain/repositories/transport.repository';
import type { QuerySpec } from '../../../../domain/shared/query-spec';
import { TransportMapper } from '../mappers/transport.mapper';
import type { TransportRecord } from '../records/transport.record';

/**
 * Dexie-backed `TransportRepository` implementation (destination-logistics
 * design §7). Provided only via `provideDataLayer()`'s `TRANSPORT_REPOSITORY`
 * binding.
 */
@Injectable()
export class IndexedDBTransportRepository implements TransportRepository {
  private readonly mapper = new TransportMapper();
  private readonly storage = inject(STORAGE_PROVIDER);

  async getByDestination(destinationId: string): Promise<Transport[]> {
    const records = await this.storage.getAll<TransportRecord>('transports');
    return records
      .filter((r) => r.destinationId === destinationId && r.deletedAt === null)
      .map((r) => this.mapper.toEntity(r));
  }

  async save(transport: Transport): Promise<void> {
    await this.storage.put('transports', this.mapper.toRecord(transport));
  }

  async softDelete(id: string): Promise<void> {
    const record = await this.storage.getById<TransportRecord>('transports', id);
    if (!record) return;
    const now = new Date().toISOString();
    await this.storage.put('transports', { ...record, deletedAt: now, lastModified: now });
  }

  async query(spec: QuerySpec<Transport>): Promise<Transport[]> {
    const records = await this.storage.query<TransportRecord>(
      'transports',
      spec as QuerySpec<TransportRecord>,
    );
    return records.filter((r) => r.deletedAt === null).map((r) => this.mapper.toEntity(r));
  }
}
