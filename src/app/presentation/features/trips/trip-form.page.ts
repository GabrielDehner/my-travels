import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
  IonButton,
  IonContent,
  IonItem,
  IonLabel,
  IonInput,
  IonTextarea,
  IonSelect,
  IonSelectOption,
  IonIcon,
} from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import { checkmark, cloudUploadOutline } from 'ionicons/icons';

import { TravelService } from '../../../application/services/travel.service';
import type { Travel } from '../../../domain/entities/travel';
import type { TravelStatus } from '../../../domain/enums/travel-status';
import { createDateRange } from '../../../domain/value-objects/date-range';
import { FALLBACK_PALETTE, tripCoverGradient } from '../../shared/utils/trip-color.util';

const TRAVEL_STATUSES: TravelStatus[] = [
  'planning',
  'upcoming',
  'ongoing',
  'completed',
  'cancelled',
];

/**
 * Trip create/edit form — part of the Trips vertical slice milestone
 * (design §5, §13). Reused for both `/trips/new` (no route id) and
 * `/trips/:id/edit` (route id present).
 */
@Component({
  selector: 'app-trip-form',
  templateUrl: './trip-form.page.html',
  styleUrl: './trip-form.page.scss',
  imports: [
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonButton,
    IonContent,
    IonItem,
    IonLabel,
    IonInput,
    IonTextarea,
    IonSelect,
    IonSelectOption,
    IonIcon,
    TranslatePipe,
  ],
})
export class TripFormPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly travelService = inject(TravelService);
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    addIcons({ checkmark, cloudUploadOutline });
    this.destroyRef.onDestroy(() => {
      if (this.coverPreviewUrl()) URL.revokeObjectURL(this.coverPreviewUrl()!);
    });
  }

  protected readonly statuses = TRAVEL_STATUSES;

  /**
   * Pre-resolved status labels. Rendering the collapsed `ion-select` display
   * value via the `translate` pipe inside `ion-select-option` could surface the
   * raw key (e.g. "enums.travelStatus.planning"); resolving with
   * `translate.instant` into static option text avoids that. Reads
   * `currentLang()` so labels re-translate on runtime language switch.
   */
  protected readonly statusOptions = computed(() => {
    this.translate.currentLang();
    return TRAVEL_STATUSES.map((value) => ({
      value,
      label: this.translate.instant(`enums.travelStatus.${value}`),
    }));
  });

  /**
   * Explicit collapsed-display text for the `ion-select`. Ionic's own
   * collapsed-text rendering reads the slotted `ion-select-option` text
   * ONLY at its own render time — on a cold load (translations not yet
   * loaded from the JSON file) it can capture the raw key and never
   * re-render when the option text updates afterward, since Angular
   * mutating slotted light-DOM text does not trigger a Stencil re-render.
   * Binding `[selectedText]` bypasses that entirely: Ionic uses this value
   * directly, and Stencil re-renders whenever this `@Prop` changes — so it
   * stays correct on cold load AND re-translates on language switch. Same
   * fix already applied to ticket-form's `selectedTypeLabel`.
   */
  protected readonly selectedStatusLabel = computed(() => {
    const current = this.status();
    return this.statusOptions().find((option) => option.value === current)?.label ?? '';
  });

  /** Preset color chips — replaces the raw "#hex" text input (fix HIGH #2). */
  protected readonly colorSwatches = FALLBACK_PALETTE;

  protected readonly title = signal('');
  protected readonly description = signal('');
  protected readonly color = signal('');
  protected readonly startDate = signal(new Date().toISOString().slice(0, 10));
  protected readonly endDate = signal(new Date().toISOString().slice(0, 10));
  protected readonly status = signal<TravelStatus>('planning');
  protected readonly notes = signal('');

  protected readonly isEditMode = signal(false);
  protected readonly saving = signal(false);
  protected readonly formError = signal<string | null>(null);

  private editingTrip: Travel | null = null;
  /**
   * `coverImageId` itself has no direct text-entry UI — travelers pick a
   * photo file instead (global aesthetic polish: real cover images). An
   * existing value is preserved untouched unless a new photo is chosen, so
   * editing never silently wipes an already-uploaded cover.
   */
  private originalCoverImageId = '';

  /** The newly-picked cover photo file, if any — stored via `setCoverImage` after save. */
  protected readonly selectedCoverFile = signal<File | null>(null);
  /** Local object URL preview for the newly-picked file — revoked on destroy/replace. */
  protected readonly coverPreviewUrl = signal<string | null>(null);
  /** Existing cover photo preview when editing a trip that already has one. */
  protected readonly existingCoverUrl = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;

    this.isEditMode.set(true);
    await this.travelService.load();
    const trip = this.travelService.trips().find((candidate) => candidate.id === id);
    if (!trip) {
      this.formError.set(this.translate.instant('tripForm.tripNotFound'));
      return;
    }

    this.editingTrip = trip;
    this.title.set(trip.title);
    this.description.set(trip.description ?? '');
    this.color.set(trip.color ?? '');
    this.originalCoverImageId = trip.coverImageId ?? '';
    this.startDate.set(trip.dates.start.slice(0, 10));
    this.endDate.set(trip.dates.end.slice(0, 10));
    this.status.set(trip.status);
    this.notes.set(trip.notes ?? '');

    if (trip.coverImageId) {
      const url = await this.travelService.getCoverImageUrl(trip);
      if (url) this.existingCoverUrl.set(url);
    }
  }

  /** Handles the "Cover photo" file picker (single obvious add-photo affordance). */
  protected onCoverFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;

    const previous = this.coverPreviewUrl();
    if (previous) URL.revokeObjectURL(previous);

    this.selectedCoverFile.set(file);
    this.coverPreviewUrl.set(file ? URL.createObjectURL(file) : null);
  }

  /** Tap a color chip to select it as the trip's accent; tap again to clear it. */
  protected selectColor(hex: string): void {
    this.color.set(this.color() === hex ? '' : hex);
  }

  /** Cover picker fallback preview when no photo is chosen yet. */
  protected coverFallbackGradient(): string {
    return tripCoverGradient(this.editingTrip?.id ?? 'new-trip', this.color() || undefined);
  }

  async save(): Promise<void> {
    this.formError.set(null);

    if (!this.title().trim()) {
      this.formError.set(this.translate.instant('tripForm.nameRequired'));
      return;
    }

    let dates;
    try {
      dates = createDateRange(this.startDate(), this.endDate());
    } catch (err) {
      this.formError.set(
        err instanceof Error ? err.message : this.translate.instant('tripForm.invalidDateRange'),
      );
      return;
    }

    this.saving.set(true);
    try {
      const description = this.description().trim();
      const color = this.color().trim();
      const notes = this.notes().trim();

      const input = {
        title: this.title().trim(),
        dates,
        status: this.status(),
        ...(description ? { description } : {}),
        ...(color ? { color } : {}),
        ...(this.originalCoverImageId ? { coverImageId: this.originalCoverImageId } : {}),
        ...(notes ? { notes } : {}),
      };

      let savedTrip: Travel | undefined;
      if (this.isEditMode() && this.editingTrip) {
        await this.travelService.update(this.editingTrip, input);
        savedTrip = this.travelService.trips().find((t) => t.id === this.editingTrip?.id);
      } else {
        savedTrip = await this.travelService.create(input);
      }

      if (this.travelService.error()) {
        this.formError.set(this.travelService.error());
        return;
      }

      const coverFile = this.selectedCoverFile();
      if (coverFile && savedTrip) {
        await this.travelService.setCoverImage(savedTrip, coverFile);
        if (this.travelService.error()) {
          this.formError.set(this.travelService.error());
          return;
        }
      }

      await this.router.navigate(['/tabs/trips']);
    } finally {
      this.saving.set(false);
    }
  }

  async cancel(): Promise<void> {
    await this.router.navigate(['/tabs/trips']);
  }
}
