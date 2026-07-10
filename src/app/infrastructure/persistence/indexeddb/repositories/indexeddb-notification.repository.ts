import { inject, Injectable } from '@angular/core';

import { STORAGE_PROVIDER } from '../../../../core/di/storage.tokens';
import type { Notification } from '../../../../domain/entities/notification';
import type { NotificationRepository } from '../../../../domain/repositories/notification.repository';
import { NotificationMapper } from '../mappers/notification.mapper';
import type { NotificationRecord } from '../records/notification.record';

/**
 * Dexie-backed `NotificationRepository` implementation (design §7). Provided
 * only via `provideDataLayer()`'s `NOTIFICATION_REPOSITORY` binding.
 */
@Injectable()
export class IndexedDBNotificationRepository implements NotificationRepository {
  private readonly mapper = new NotificationMapper();
  private readonly storage = inject(STORAGE_PROVIDER);

  async getByTravel(travelId: string): Promise<Notification[]> {
    const records = await this.storage.getAll<NotificationRecord>('notifications');
    return records
      .filter((r) => r.travelId === travelId && r.deletedAt === null)
      .map((r) => this.mapper.toEntity(r));
  }

  async getDue(now: string): Promise<Notification[]> {
    const records = await this.storage.getAll<NotificationRecord>('notifications');
    const nowTime = new Date(now).getTime();
    return records
      .filter((r) => r.deletedAt === null && !r.fired && new Date(r.triggerAt).getTime() <= nowTime)
      .map((r) => this.mapper.toEntity(r));
  }

  async save(notification: Notification): Promise<void> {
    await this.storage.put('notifications', this.mapper.toRecord(notification));
  }

  async markFired(id: string): Promise<void> {
    const record = await this.storage.getById<NotificationRecord>('notifications', id);
    if (!record) return;
    const now = new Date().toISOString();
    await this.storage.put('notifications', { ...record, fired: true, lastModified: now });
  }

  async softDelete(id: string): Promise<void> {
    const record = await this.storage.getById<NotificationRecord>('notifications', id);
    if (!record) return;
    const now = new Date().toISOString();
    await this.storage.put('notifications', { ...record, deletedAt: now, lastModified: now });
  }
}
