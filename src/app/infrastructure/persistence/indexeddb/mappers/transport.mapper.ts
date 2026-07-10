import type { Transport } from '../../../../domain/entities/transport';
import type { TransportRecord } from '../records/transport.record';

import type { Mapper } from './mapper';

export class TransportMapper implements Mapper<Transport, TransportRecord> {
  toRecord(entity: Transport): TransportRecord {
    return { ...entity };
  }

  toEntity(record: TransportRecord): Transport {
    return { ...record };
  }
}
