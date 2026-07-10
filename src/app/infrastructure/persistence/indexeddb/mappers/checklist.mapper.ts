import type { Checklist } from '../../../../domain/entities/checklist';
import type { ChecklistRecord } from '../records/checklist.record';

import type { Mapper } from './mapper';

export class ChecklistMapper implements Mapper<Checklist, ChecklistRecord> {
  toRecord(entity: Checklist): ChecklistRecord {
    return { ...entity };
  }

  toEntity(record: ChecklistRecord): Checklist {
    return { ...record };
  }
}
