import type { Notification } from '../entities/notification';

/**
 * Port for Notification (reminder) persistence (design §5, §7).
 */
export interface NotificationRepository {
  getByTravel(travelId: string): Promise<Notification[]>;
  /** Returns notifications with `triggerAt <= now` that have not fired yet. */
  getDue(now: string): Promise<Notification[]>;
  save(notification: Notification): Promise<void>;
  markFired(id: string): Promise<void>;
  softDelete(id: string): Promise<void>;
}
