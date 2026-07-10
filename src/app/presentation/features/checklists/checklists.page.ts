import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  IonList,
  IonItem,
  IonLabel,
  IonInput,
  IonButton,
  IonIcon,
  IonCheckbox,
  IonItemSliding,
  IonItemOptions,
  IonItemOption,
  IonProgressBar,
  IonChip,
  AlertController,
} from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import { add, trashOutline } from 'ionicons/icons';

import { ChecklistService } from '../../../application/services/checklist.service';
import type { ChecklistItem } from '../../../domain/entities/checklist-item';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { tripId$ } from '../../shared/utils/trip-route.util';

/**
 * Checklists — custom per-trip checklists (e.g. Packing, Docs) with
 * add/check/uncheck/delete items, a pending count, and a progress bar
 * (design §13, spec "Checklists"). A single trip may hold several
 * checklists; the chip list selects which one's items render below.
 */
@Component({
  selector: 'app-checklists',
  templateUrl: './checklists.page.html',
  styleUrl: './checklists.page.scss',
  imports: [
    FormsModule,
    IonList,
    IonItem,
    IonLabel,
    IonInput,
    IonButton,
    IonIcon,
    IonCheckbox,
    IonItemSliding,
    IonItemOptions,
    IonItemOption,
    IonProgressBar,
    IonChip,
    EmptyStateComponent,
    TranslatePipe,
  ],
})
export class ChecklistsPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly checklistService = inject(ChecklistService);
  private readonly alertCtrl = inject(AlertController);
  private readonly translate = inject(TranslateService);

  protected readonly tripId = signal('');
  protected readonly selectedChecklistId = signal<string | null>(null);
  protected readonly newChecklistTitle = signal('');
  protected readonly newItemLabel = signal('');

  protected readonly selectedChecklist = computed(
    () =>
      this.checklistService.checklists().find((c) => c.id === this.selectedChecklistId()) ?? null,
  );

  protected readonly selectedItems = computed(() => {
    const id = this.selectedChecklistId();
    if (!id) return [];
    return this.checklistService
      .items()
      .filter((item) => item.checklistId === id)
      .sort((a, b) => a.order - b.order);
  });

  protected readonly pendingCount = computed(
    () => this.selectedItems().filter((item) => !item.done).length,
  );

  protected readonly progressRatio = computed(() => {
    const items = this.selectedItems();
    if (items.length === 0) return 0;
    return (items.length - this.pendingCount()) / items.length;
  });

  constructor() {
    addIcons({ add, trashOutline });
  }

  ngOnInit(): void {
    // Reactive resolution (fix: robust `tripId` — see trip-route.util.ts).
    tripId$(this.route)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((tripId) => {
        this.tripId.set(tripId);
        void this.checklistService.load(tripId).then(() => {
          const first = this.checklistService.checklists()[0];
          if (first) this.selectedChecklistId.set(first.id);
        });
      });
  }

  selectChecklist(id: string): void {
    this.selectedChecklistId.set(id);
  }

  async createChecklist(): Promise<void> {
    const title = this.newChecklistTitle().trim();
    if (!title) return;
    const checklist = await this.checklistService.createChecklist({
      travelId: this.tripId(),
      title,
    });
    this.newChecklistTitle.set('');
    if (checklist) this.selectedChecklistId.set(checklist.id);
  }

  async deleteChecklist(id: string): Promise<void> {
    const checklist = this.checklistService.checklists().find((c) => c.id === id);
    const alert = await this.alertCtrl.create({
      header: this.translate.instant('checklists.deleteConfirmTitle'),
      message: this.translate.instant('checklists.deleteConfirmMessage', {
        title: checklist?.title ?? '',
      }),
      buttons: [
        { text: this.translate.instant('common.cancel'), role: 'cancel' },
        {
          text: this.translate.instant('common.delete'),
          role: 'destructive',
          handler: () => this.confirmedDeleteChecklist(id),
        },
      ],
    });
    await alert.present();
  }

  private async confirmedDeleteChecklist(id: string): Promise<void> {
    await this.checklistService.softDelete(id, this.tripId());
    if (this.selectedChecklistId() === id) {
      const remaining = this.checklistService.checklists().find((c) => c.id !== id);
      this.selectedChecklistId.set(remaining?.id ?? null);
    }
  }

  async addItem(): Promise<void> {
    const checklistId = this.selectedChecklistId();
    const label = this.newItemLabel().trim();
    if (!checklistId || !label) return;
    await this.checklistService.addItem({ checklistId, label }, this.tripId());
    this.newItemLabel.set('');
  }

  async toggleItem(item: ChecklistItem): Promise<void> {
    await this.checklistService.toggleItem(item, this.tripId());
  }

  async deleteItem(item: ChecklistItem, slidingItem: IonItemSliding): Promise<void> {
    await slidingItem.close();
    await this.checklistService.softDelete(item.id, this.tripId());
  }
}
