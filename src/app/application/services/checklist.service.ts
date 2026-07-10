import { Injectable, computed, inject, signal } from '@angular/core';

import { CHECKLIST_REPOSITORY } from '../../core/di/repository.tokens';
import type { Checklist } from '../../domain/entities/checklist';
import type { ChecklistItem } from '../../domain/entities/checklist-item';
import { createBaseEntityFields, touchTimestamps } from '../shared/base-entity.factory';
import { toErrorMessage } from '../shared/error.util';

/** Fields required to create a new Checklist; `BaseEntity` fields are generated. */
export interface NewChecklistInput {
  travelId: string;
  title: string;
}

/** Fields required to create a new ChecklistItem; `BaseEntity` fields are generated. */
export interface NewChecklistItemInput {
  checklistId: string;
  label: string;
}

/**
 * Use-case service for Checklists + their items — toggle-done and a pending
 * count for the Today home summary (design §5, §13).
 */
@Injectable({ providedIn: 'root' })
export class ChecklistService {
  private readonly repo = inject(CHECKLIST_REPOSITORY);

  readonly checklists = signal<Checklist[]>([]);
  readonly items = signal<ChecklistItem[]>([]);
  readonly error = signal<string | null>(null);

  readonly pendingCount = computed(() => this.items().filter((i) => !i.done).length);

  async load(travelId: string): Promise<void> {
    try {
      const checklists = await this.repo.getByTravel(travelId);
      this.checklists.set(checklists);
      const itemLists = await Promise.all(checklists.map((c) => this.repo.getItems(c.id)));
      const items = itemLists.flat();
      this.items.set([...items].sort((a, b) => a.order - b.order));
    } catch (err) {
      this.error.set(toErrorMessage(err));
    }
  }

  async createChecklist(input: NewChecklistInput): Promise<Checklist | undefined> {
    try {
      const checklist: Checklist = { ...createBaseEntityFields(), ...input };
      await this.repo.saveChecklist(checklist);
      await this.load(input.travelId);
      return checklist;
    } catch (err) {
      this.error.set(toErrorMessage(err));
      return undefined;
    }
  }

  async addItem(
    input: NewChecklistItemInput,
    travelId: string,
  ): Promise<ChecklistItem | undefined> {
    try {
      const order = this.items().filter((i) => i.checklistId === input.checklistId).length;
      const item: ChecklistItem = { ...createBaseEntityFields(), ...input, done: false, order };
      await this.repo.saveItem(item);
      await this.load(travelId);
      return item;
    } catch (err) {
      this.error.set(toErrorMessage(err));
      return undefined;
    }
  }

  async toggleItem(item: ChecklistItem, travelId: string): Promise<void> {
    try {
      const updated: ChecklistItem = { ...item, done: !item.done, ...touchTimestamps() };
      await this.repo.saveItem(updated);
      await this.load(travelId);
    } catch (err) {
      this.error.set(toErrorMessage(err));
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
