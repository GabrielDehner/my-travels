import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonLabel,
  IonItem,
  IonIcon,
  IonButton,
  IonInput,
  IonSelect,
  IonSelectOption,
  ToastController,
} from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import {
  add,
  trashOutline,
  openOutline,
  pencilOutline,
  folderOutline,
  cloudUploadOutline,
} from 'ionicons/icons';

import { DestinationService } from '../../../application/services/destination.service';
import { DocumentService } from '../../../application/services/document.service';
import { HotelService } from '../../../application/services/hotel.service';
import type { TravelDocument } from '../../../domain/entities/travel-document';
import type { DocumentCategory } from '../../../domain/enums/document-category';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { tripId$ } from '../../shared/utils/trip-route.util';

/** Enum values in display order; the i18n label lives at `documents.categories.{value}`. */
const DOCUMENT_CATEGORY_VALUES: readonly DocumentCategory[] = [
  'flights',
  'hotels',
  'tickets',
  'insurance',
  'passport',
  'visa',
  'license',
  'receipts',
  'other',
];

interface HotelOption {
  id: string;
  label: string;
}

/**
 * Documents grid — upload/open/rename/move/delete Documents, grouped by
 * category (design §13). Supports attaching a document to a Hotel via
 * `entityRef` (spec "Attach a document to lodging" scenario). Blob object
 * URLs opened via `openDocument` are revoked on destroy (design §9).
 */
@Component({
  selector: 'app-documents',
  templateUrl: './documents.page.html',
  styleUrl: './documents.page.scss',
  imports: [
    FormsModule,
    IonLabel,
    IonItem,
    IonIcon,
    IonButton,
    IonInput,
    IonSelect,
    IonSelectOption,
    EmptyStateComponent,
    TranslatePipe,
  ],
})
export class DocumentsPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destinationService = inject(DestinationService);
  private readonly hotelService = inject(HotelService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly translate = inject(TranslateService);
  private readonly toastCtrl = inject(ToastController);
  protected readonly documentService = inject(DocumentService);

  protected readonly tripId = signal('');
  protected readonly hotelOptions = signal<HotelOption[]>([]);

  /**
   * Pre-resolved category labels. Rendering the collapsed `ion-select`
   * display value via the `translate` pipe inside `ion-select-option` can
   * surface the raw key (e.g. "documents.categories.other") instead of the
   * translated label — same issue already fixed in `trip-form.page.ts`'s
   * `statusOptions`. Resolving with `translate.instant` into static option
   * text avoids that. Reads `currentLang()` so labels re-translate on
   * runtime language switch.
   */
  protected readonly categoryOptions = computed(() => {
    this.translate.currentLang();
    return DOCUMENT_CATEGORY_VALUES.map((value) => ({
      value,
      label: this.translate.instant(`documents.categories.${value}`),
    }));
  });

  /**
   * Guards MUST-FIX #4/#3: if this page is ever reached without a resolved
   * trip id (e.g. a stale/direct link with no parent `:id` param), the
   * upload form never renders a broken, context-less flow — the traveler
   * sees a friendly prompt to open a trip first instead.
   */
  protected readonly hasTripContext = computed(() => this.tripId().length > 0);

  protected readonly groupedDocuments = computed(() => {
    // Read `currentLang()` so this recomputes (and re-translates group
    // labels) when the user switches language at runtime.
    this.translate.currentLang();
    const docs = this.documentService.documents();
    return DOCUMENT_CATEGORY_VALUES.map((value) => ({
      category: value,
      label: this.translate.instant(`documents.categories.${value}`),
      documents: docs.filter((d) => d.category === value),
    })).filter((group) => group.documents.length > 0);
  });

  protected readonly selectedFile = signal<File | null>(null);
  protected readonly uploadTitle = signal('');
  protected readonly uploadCategory = signal<DocumentCategory>('other');
  protected readonly attachToHotelId = signal('');
  protected readonly uploadError = signal<string | null>(null);
  protected readonly uploading = signal(false);

  protected readonly renamingId = signal<string | null>(null);
  protected readonly renameValue = signal('');

  private readonly openedUrls: string[] = [];

  constructor() {
    addIcons({ add, trashOutline, openOutline, pencilOutline, folderOutline, cloudUploadOutline });
    this.destroyRef.onDestroy(() => {
      for (const url of this.openedUrls) URL.revokeObjectURL(url);
    });
  }

  ngOnInit(): void {
    // Reactive resolution (fix: robust `tripId` — see trip-route.util.ts):
    // reads the nearest ancestor route's `id` param and re-resolves it on
    // every navigation, instead of a one-shot `route.parent?.snapshot` read
    // that could be empty on first activation or stale after Ionic reuses
    // this page instance across trips.
    tripId$(this.route)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((tripId) => {
        this.tripId.set(tripId);
        if (!tripId) return;
        void this.documentService.load(tripId);
        void this.loadHotelOptions(tripId);
      });
  }

  async goToTrips(): Promise<void> {
    await this.router.navigate(['/tabs/trips']);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile.set(input.files?.[0] ?? null);
  }

  async upload(): Promise<void> {
    this.uploadError.set(null);
    if (!this.hasTripContext()) {
      this.uploadError.set(this.translate.instant('documents.noTripContext'));
      return;
    }
    const file = this.selectedFile();
    if (!file) {
      this.uploadError.set(this.translate.instant('documents.chooseFileFirst'));
      return;
    }

    this.uploading.set(true);
    try {
      const title = this.uploadTitle().trim() || file.name;
      const attachToHotelId = this.attachToHotelId();

      const saved = await this.documentService.upload({
        travelId: this.tripId(),
        title,
        category: this.uploadCategory(),
        blob: file,
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        ...(attachToHotelId ? { entityRef: { type: 'hotel' as const, id: attachToHotelId } } : {}),
      });

      if (saved) {
        this.selectedFile.set(null);
        this.uploadTitle.set('');
        this.attachToHotelId.set('');
        await this.showToast(this.translate.instant('documents.uploadSuccess'));
      }
    } finally {
      this.uploading.set(false);
    }
  }

  private async showToast(message: string): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      position: 'bottom',
      color: 'success',
    });
    await toast.present();
  }

  async openDocument(doc: TravelDocument): Promise<void> {
    const url = await this.documentService.openUrl(doc.id);
    if (!url) return;
    this.openedUrls.push(url);
    window.open(url, '_blank');
  }

  startRename(doc: TravelDocument): void {
    this.renamingId.set(doc.id);
    this.renameValue.set(doc.title);
  }

  async confirmRename(doc: TravelDocument): Promise<void> {
    const title = this.renameValue().trim();
    if (!title) return;
    await this.documentService.updateMetadata(doc, { title });
    this.renamingId.set(null);
  }

  cancelRename(): void {
    this.renamingId.set(null);
  }

  async moveToCategory(doc: TravelDocument, category: DocumentCategory): Promise<void> {
    if (category === doc.category) return;
    await this.documentService.updateMetadata(doc, { category });
  }

  async deleteDocument(doc: TravelDocument): Promise<void> {
    await this.documentService.softDelete(doc.id, this.tripId());
  }

  protected attachedLabel(doc: TravelDocument): string | null {
    if (!doc.entityRef || doc.entityRef.type !== 'hotel') return null;
    const hotel = this.hotelOptions().find((h) => h.id === doc.entityRef?.id);
    return hotel
      ? this.translate.instant('documents.attachedTo', { label: hotel.label })
      : this.translate.instant('documents.attachedGeneric');
  }

  private async loadHotelOptions(tripId: string): Promise<void> {
    await this.destinationService.load(tripId);
    const destinations = this.destinationService.destinations();
    const perDestination = await Promise.all(
      destinations.map(async (destination) => {
        const hotels = await this.hotelService.listFor(destination.id);
        return hotels.map((hotel) => ({
          id: hotel.id,
          label: `${hotel.name} (${destination.name})`,
        }));
      }),
    );
    this.hotelOptions.set(perDestination.flat());
  }
}
