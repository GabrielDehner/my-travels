import { Injectable, inject, signal } from '@angular/core';

import { NOTIFICATION_REPOSITORY } from '../../core/di/repository.tokens';
import type { Notification } from '../../domain/entities/notification';
import type { EntityRef } from '../../domain/value-objects/entity-ref';
import { createBaseEntityFields } from '../shared/base-entity.factory';
import { toErrorMessage } from '../shared/error.util';

/** Fields required to schedule a new reminder; `BaseEntity` fields are generated. */
export interface NewReminderInput {
  travelId: string;
  triggerAt: string;
  offsetLabel: string;
  message: string;
  entityRef?: EntityRef;
}

/**
 * Reminder use-case service — foreground + on-open due checks ONLY (design
 * §11 resolved decision #3, §14). True background/closed-app push is
 * architecturally impossible without a backend and is explicitly deferred.
 * Call `checkDue()` on app open/resume.
 */
@Injectable({ providedIn: 'root' })
export class ReminderService {
  private readonly repo = inject(NOTIFICATION_REPOSITORY);

  readonly notifications = signal<Notification[]>([]);
  readonly due = signal<Notification[]>([]);
  readonly error = signal<string | null>(null);

  async load(travelId: string): Promise<void> {
    try {
      this.notifications.set(await this.repo.getByTravel(travelId));
    } catch (err) {
      this.error.set(toErrorMessage(err));
    }
  }

  /** Computes reminders due `now` (default: current time) and fires them. */
  async checkDue(now: string = new Date().toISOString()): Promise<Notification[]> {
    try {
      const due = await this.repo.getDue(now);
      this.due.set(due);
      return due;
    } catch (err) {
      this.error.set(toErrorMessage(err));
      return [];
    }
  }

  async markFired(id: string, travelId: string): Promise<void> {
    try {
      await this.repo.markFired(id);
      this.due.set(this.due().filter((n) => n.id !== id));
      await this.load(travelId);
    } catch (err) {
      this.error.set(toErrorMessage(err));
    }
  }

  async schedule(input: NewReminderInput): Promise<Notification | undefined> {
    try {
      const notification: Notification = { ...createBaseEntityFields(), ...input, fired: false };
      await this.repo.save(notification);
      await this.load(input.travelId);
      return notification;
    } catch (err) {
      this.error.set(toErrorMessage(err));
      return undefined;
    }
  }

  async softDelete(id: string, travelId: string): Promise<void> {
    try {
      await this.repo.softDelete(id);
      await this.load(travelId);
    } catch (err) {
      this.error.set(toErrorMessage(err));
    }
  }
}
