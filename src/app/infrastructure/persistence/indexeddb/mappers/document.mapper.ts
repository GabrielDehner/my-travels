import type { TravelDocument } from '../../../../domain/entities/travel-document';
import type { DocumentRecord } from '../records/document.record';

import type { Mapper } from './mapper';

export class DocumentMapper implements Mapper<TravelDocument, DocumentRecord> {
  toRecord(entity: TravelDocument): DocumentRecord {
    return { ...entity };
  }

  toEntity(record: DocumentRecord): TravelDocument {
    return { ...record };
  }
}
