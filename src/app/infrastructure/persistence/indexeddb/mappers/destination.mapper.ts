import type { Destination } from '../../../../domain/entities/destination';
import type { DestinationRecord } from '../records/destination.record';

import type { Mapper } from './mapper';

export class DestinationMapper implements Mapper<Destination, DestinationRecord> {
  toRecord(entity: Destination): DestinationRecord {
    return { ...entity };
  }

  toEntity(record: DestinationRecord): Destination {
    return { ...record };
  }
}
