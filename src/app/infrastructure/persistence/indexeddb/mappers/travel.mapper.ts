import type { Travel } from '../../../../domain/entities/travel';
import type { TravelRecord } from '../records/travel.record';

import type { Mapper } from './mapper';

export class TravelMapper implements Mapper<Travel, TravelRecord> {
  toRecord(entity: Travel): TravelRecord {
    return { ...entity };
  }

  toEntity(record: TravelRecord): Travel {
    return { ...record };
  }
}
