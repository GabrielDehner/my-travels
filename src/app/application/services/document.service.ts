import { Injectable, inject, signal } from '@angular/core';

import { DOCUMENT_REPOSITORY } from '../../core/di/repository.tokens';
import type { TravelDocument } from '../../domain/entities/travel-document';
import type { DocumentCategory } from '../../domain/enums/document-category';
import type { EntityRef } from '../../domain/value-objects/entity-ref';
import { createBaseEntityFields, touchTimestamps } from '../shared/base-entity.factory';
import { toErrorMessage } from '../shared/error.util';

/** Fields + payload required to upload a new Document; `BaseEntity` fields are generated. */
export interface NewDocumentInput {
  travelId: string;
  title: string;
  category: DocumentCategory;
  blob: Blob;
  fileName: string;
  mimeType: string;
  entityRef?: EntityRef;
}

/** Renamable/movable metadata fields for an existing Document. */
export interface DocumentMetadataChanges {
  title?: string;
  category?: DocumentCategory;
  fileName?: string;
  entityRef?: EntityRef;
}

/**
 * Use-case service for Documents — upload/rename/move/delete via the
 * repository + blob store (design §5, §9). `rename`/`move` re-read the blob
 * (`getBlob`) because `DocumentRepository.saveWithBlob` is the only write
 * primitive the port exposes; the blob itself is unchanged in that path.
 */
@Injectable({ providedIn: 'root' })
export class DocumentService {
  private readonly repo = inject(DOCUMENT_REPOSITORY);

  readonly documents = signal<TravelDocument[]>([]);
  readonly error = signal<string | null>(null);

  async load(travelId: string): Promise<void> {
    try {
      this.documents.set(await this.repo.getByTravel(travelId));
    } catch (err) {
      this.error.set(toErrorMessage(err));
    }
  }

  async upload(input: NewDocumentInput): Promise<TravelDocument | undefined> {
    try {
      const { blob, ...metadata } = input;
      const doc: TravelDocument = {
        ...createBaseEntityFields(),
        ...metadata,
        blobId: crypto.randomUUID(),
        sizeBytes: blob.size,
      };
      await this.repo.saveWithBlob(doc, blob);
      await this.load(input.travelId);
      return doc;
    } catch (err) {
      this.error.set(toErrorMessage(err));
      return undefined;
    }
  }

  /** Renames/re-categorizes/re-targets a Document without changing its blob. */
  async updateMetadata(doc: TravelDocument, changes: DocumentMetadataChanges): Promise<void> {
    try {
      const blob = await this.repo.getBlob(doc.id);
      if (!blob) {
        this.error.set('The original file for this document could not be found.');
        return;
      }
      const updated: TravelDocument = { ...doc, ...changes, ...touchTimestamps() };
      await this.repo.saveWithBlob(updated, blob);
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

  async openUrl(documentId: string): Promise<string | undefined> {
    try {
      const blob = await this.repo.getBlob(documentId);
      if (!blob) return undefined;
      return URL.createObjectURL(blob);
    } catch (err) {
      this.error.set(toErrorMessage(err));
      return undefined;
    }
  }
}
