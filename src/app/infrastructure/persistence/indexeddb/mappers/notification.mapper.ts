import type { Notification } from '../../../../domain/entities/notification';
import type { NotificationRecord } from '../records/notification.record';

import type { Mapper } from './mapper';

export class NotificationMapper implements Mapper<Notification, NotificationRecord> {
  toRecord(entity: Notification): NotificationRecord {
    return { ...entity };
  }

  toEntity(record: NotificationRecord): Notification {
    return { ...record };
  }
}
