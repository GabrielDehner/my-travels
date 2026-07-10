import { inject, Injectable } from '@angular/core';

import { STORAGE_PROVIDER } from '../../../../core/di/storage.tokens';
import type { Checklist } from '../../../../domain/entities/checklist';
import type { ChecklistItem } from '../../../../domain/entities/checklist-item';
import type { ChecklistRepository } from '../../../../domain/repositories/checklist.repository';
import { ChecklistItemMapper } from '../mappers/checklist-item.mapper';
import { ChecklistMapper } from '../mappers/checklist.mapper';
import type { ChecklistItemRecord } from '../records/checklist-item.record';
import type { ChecklistRecord } from '../records/checklist.record';

/**
 * Dexie-backed `ChecklistRepository` implementation (design §7). Provided
 * only via `provideDataLayer()`'s `CHECKLIST_REPOSITORY` binding.
 */
@Injectable()
export class IndexedDBChecklistRepository implements ChecklistRepository {
  private readonly checklistMapper = new ChecklistMapper();
  private readonly itemMapper = new ChecklistItemMapper();
  private readonly storage = inject(STORAGE_PROVIDER);

  async getByTravel(travelId: string): Promise<Checklist[]> {
    const records = await this.storage.getAll<ChecklistRecord>('checklists');
    return records
      .filter((r) => r.travelId === travelId && r.deletedAt === null)
      .map((r) => this.checklistMapper.toEntity(r));
  }

  async getItems(checklistId: string): Promise<ChecklistItem[]> {
    const records = await this.storage.getAll<ChecklistItemRecord>('checklistItems');
    return records
      .filter((r) => r.checklistId === checklistId && r.deletedAt === null)
      .map((r) => this.itemMapper.toEntity(r));
  }

  async saveChecklist(checklist: Checklist): Promise<void> {
    await this.storage.put('checklists', this.checklistMapper.toRecord(checklist));
  }

  async saveItem(item: ChecklistItem): Promise<void> {
    await this.storage.put('checklistItems', this.itemMapper.toRecord(item));
  }

  async softDelete(id: string): Promise<void> {
    const now = new Date().toISOString();
    const checklist = await this.storage.getById<ChecklistRecord>('checklists', id);
    if (checklist) {
      await this.storage.put('checklists', { ...checklist, deletedAt: now, lastModified: now });
      return;
    }
    const item = await this.storage.getById<ChecklistItemRecord>('checklistItems', id);
    if (item) {
      await this.storage.put('checklistItems', { ...item, deletedAt: now, lastModified: now });
    }
  }
}
