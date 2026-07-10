import { inject, Injectable } from '@angular/core';

import { STORAGE_PROVIDER } from '../../../../core/di/storage.tokens';
import type { TravelDocument } from '../../../../domain/entities/travel-document';
import type { DocumentRepository } from '../../../../domain/repositories/document.repository';
import type { QuerySpec } from '../../../../domain/shared/query-spec';
import { DocumentMapper } from '../mappers/document.mapper';
import type { DocumentRecord } from '../records/document.record';

/**
 * Dexie-backed `DocumentRepository` implementation (design §7, §9). Blob
 * payloads live in the dedicated `documentBlobs` store, addressed by
 * `blobId`, so metadata queries never deserialize binary data. Provided only
 * via `provideDataLayer()`'s `DOCUMENT_REPOSITORY` binding.
 */
@Injectable()
export class IndexedDBDocumentRepository implements DocumentRepository {
  private readonly mapper = new DocumentMapper();
  private readonly storage = inject(STORAGE_PROVIDER);

  async getByTravel(travelId: string): Promise<TravelDocument[]> {
    const records = await this.storage.getAll<DocumentRecord>('documents');
    return records
      .filter((r) => r.travelId === travelId && r.deletedAt === null)
      .map((r) => this.mapper.toEntity(r));
  }

  async getBlob(documentId: string): Promise<Blob | undefined> {
    const record = await this.storage.getById<DocumentRecord>('documents', documentId);
    if (!record) return undefined;
    return this.storage.blobs.get(record.blobId);
  }

  async saveWithBlob(doc: TravelDocument, blob: Blob): Promise<void> {
    await this.storage.transaction(['documents'], async () => {
      await this.storage.blobs.put(doc.blobId, blob);
      await this.storage.put('documents', this.mapper.toRecord(doc));
    });
  }

  async softDelete(id: string): Promise<void> {
    const record = await this.storage.getById<DocumentRecord>('documents', id);
    if (!record) return;
    const now = new Date().toISOString();
    await this.storage.put('documents', { ...record, deletedAt: now, lastModified: now });
    // Blobs are physically deleted to reclaim quota (design §9) — the
    // metadata tombstone above already carries the sync signal.
    await this.storage.blobs.delete(record.blobId);
  }

  async query(spec: QuerySpec<TravelDocument>): Promise<TravelDocument[]> {
    const records = await this.storage.query<DocumentRecord>(
      'documents',
      spec as QuerySpec<DocumentRecord>,
    );
    return records.filter((r) => r.deletedAt === null).map((r) => this.mapper.toEntity(r));
  }
}
