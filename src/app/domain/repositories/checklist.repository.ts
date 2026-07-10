import type { Checklist } from '../entities/checklist';
import type { ChecklistItem } from '../entities/checklist-item';

/**
 * Port for Checklist + ChecklistItem persistence (design §5, §7).
 */
export interface ChecklistRepository {
  getByTravel(travelId: string): Promise<Checklist[]>;
  getItems(checklistId: string): Promise<ChecklistItem[]>;
  saveChecklist(checklist: Checklist): Promise<void>;
  saveItem(item: ChecklistItem): Promise<void>;
  softDelete(id: string): Promise<void>;
}
