import type { TravelDocument } from '../entities/travel-document';
import type { QuerySpec } from '../shared/query-spec';

/**
 * Port for TravelDocument persistence, including the Blob payload
 * (design §5, §7, §9).
 */
export interface DocumentRepository {
  getByTravel(travelId: string): Promise<TravelDocument[]>;
  getBlob(documentId: string): Promise<Blob | undefined>;
  saveWithBlob(doc: TravelDocument, blob: Blob): Promise<void>;
  softDelete(id: string): Promise<void>;
  query(spec: QuerySpec<TravelDocument>): Promise<TravelDocument[]>;
}
