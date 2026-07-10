import type { ChecklistItem } from '../../../../domain/entities/checklist-item';
import type { ChecklistItemRecord } from '../records/checklist-item.record';

import type { Mapper } from './mapper';

export class ChecklistItemMapper implements Mapper<ChecklistItem, ChecklistItemRecord> {
  toRecord(entity: ChecklistItem): ChecklistItemRecord {
    return { ...entity };
  }

  toEntity(record: ChecklistItemRecord): ChecklistItem {
    return { ...record };
  }
}
