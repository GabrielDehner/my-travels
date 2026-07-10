import type { Hotel } from '../../../../domain/entities/hotel';
import type { HotelRecord } from '../records/hotel.record';

import type { Mapper } from './mapper';

export class HotelMapper implements Mapper<Hotel, HotelRecord> {
  toRecord(entity: Hotel): HotelRecord {
    return { ...entity };
  }

  toEntity(record: HotelRecord): Hotel {
    return { ...record };
  }
}
