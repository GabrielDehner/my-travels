import { Component, OnInit, inject, signal } from '@angular/core';
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
import { cloudUploadOutline, documentAttachOutline, trashOutline } from 'ionicons/icons';

import { DocumentService } from '../../../application/services/document.service';
import { HotelService } from '../../../application/services/hotel.service';
import type { Hotel } from '../../../domain/entities/hotel';
import type { TravelDocument } from '../../../domain/entities/travel-document';
import type { Currency } from '../../../domain/enums/currency';
import { createMoney } from '../../../domain/value-objects/money';
import { resolveTripId } from '../../shared/utils/trip-route.util';

const CURRENCIES: Currency[] = [
  'USD',
  'EUR',
  'GBP',
  'JPY',
  'CNY',
  'AUD',
  'CAD',
  'CHF',
  'MXN',
  'BRL',
  'ARS',
  'CLP',
  'COP',
  'PEN',
  'INR',
  'THB',
  'VND',
  'KRW',
  'SGD',
  'NZD',
];

/**
 * Lodging create/edit form — reused for both
 * `/trips/:id/destinations/:destinationId/lodging/new` (no hotel id) and
 * `/trips/:id/destinations/:destinationId/lodging/:hotelId/edit`, per spec
 * "Lodging" requirement and design §2 `Hotel` entity.
 */
@Component({
  selector: 'app-lodging-form',
  templateUrl: './lodging-form.page.html',
  styleUrl: './lodging-form.page.scss',
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
export class LodgingFormPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly hotelService = inject(HotelService);
  private readonly documentService = inject(DocumentService);
  private readonly translate = inject(TranslateService);

  protected readonly currencies = CURRENCIES;

  protected readonly tripId = signal('');
  protected readonly destinationId = signal('');

  protected readonly name = signal('');
  protected readonly address = signal('');
  protected readonly phone = signal('');
  protected readonly email = signal('');
  protected readonly web = signal('');
  protected readonly checkIn = signal(new Date().toISOString().slice(0, 10));
  protected readonly checkOut = signal(new Date().toISOString().slice(0, 10));
  protected readonly confirmationCode = signal('');
  protected readonly priceAmount = signal('');
  protected readonly priceCurrency = signal<Currency>('USD');
  protected readonly notes = signal('');

  // Location (destination-logistics design ADR "Terminal + lodging
  // location") — address is already captured above; lat/lng are optional
  // and combined with it into `Hotel.geo` so "Cómo llegar" can prefer
  // coordinates over the address.
  protected readonly latitude = signal('');
  protected readonly longitude = signal('');

  // Pasted Google Maps share link (feature: pasteable Google Maps link) —
  // when present, "Cómo llegar" opens THIS exact link instead of one built
  // from address/coordinates (design maps.util `resolveMapsUrl`).
  protected readonly mapsUrl = signal('');

  // Reservation file(s) — reuses Documents/Blob via `entityRef:{type:'hotel'}`
  // (design "Reservation = file OR link"; lodging only supports files).
  protected readonly attachedFiles = signal<TravelDocument[]>([]);
  protected readonly pendingFiles = signal<File[]>([]);
  protected readonly uploadingFiles = signal(false);

  protected readonly isEditMode = signal(false);
  protected readonly saving = signal(false);
  protected readonly formError = signal<string | null>(null);

  private editingHotel: Hotel | null = null;

  constructor() {
    addIcons({ cloudUploadOutline, documentAttachOutline, trashOutline });
  }

  async ngOnInit(): Promise<void> {
    // Robust nearest-ancestor resolution (fix — see trip-route.util.ts).
    const tripId = resolveTripId(this.route);
    this.tripId.set(tripId);
    const destinationId = this.route.snapshot.paramMap.get('destinationId') ?? '';
    this.destinationId.set(destinationId);

    const hotelId = this.route.snapshot.paramMap.get('hotelId');
    if (!hotelId) return;

    this.isEditMode.set(true);
    await this.hotelService.load(destinationId);
    const hotel = this.hotelService.hotels().find((candidate) => candidate.id === hotelId);
    if (!hotel) {
      this.formError.set(this.translate.instant('lodgingForm.lodgingNotFound'));
      return;
    }

    this.editingHotel = hotel;
    this.name.set(hotel.name);
    this.address.set(hotel.address ?? '');
    this.phone.set(hotel.phone ?? '');
    this.email.set(hotel.email ?? '');
    this.web.set(hotel.web ?? '');
    this.checkIn.set(hotel.checkIn.slice(0, 10));
    this.checkOut.set(hotel.checkOut.slice(0, 10));
    this.confirmationCode.set(hotel.confirmationCode ?? '');
    this.priceAmount.set(hotel.price ? (hotel.price.amountMinor / 100).toFixed(2) : '');
    this.priceCurrency.set(hotel.price?.currency ?? 'USD');
    this.notes.set(hotel.notes ?? '');
    this.latitude.set(hotel.geo?.lat != null ? String(hotel.geo.lat) : '');
    this.longitude.set(hotel.geo?.lng != null ? String(hotel.geo.lng) : '');
    this.mapsUrl.set(hotel.mapsUrl ?? '');

    await this.loadAttachedFiles(tripId, hotel.id);
  }

  async save(): Promise<void> {
    this.formError.set(null);

    if (!this.name().trim()) {
      this.formError.set(this.translate.instant('lodgingForm.nameRequired'));
      return;
    }

    this.saving.set(true);
    try {
      const address = this.address().trim();
      const phone = this.phone().trim();
      const email = this.email().trim();
      const web = this.web().trim();
      const confirmationCode = this.confirmationCode().trim();
      const notes = this.notes().trim();
      const mapsUrl = this.mapsUrl().trim();
      const amount = Number.parseFloat(this.priceAmount());
      const hasPrice = Number.isFinite(amount);
      const lat = Number.parseFloat(this.latitude());
      const lng = Number.parseFloat(this.longitude());
      const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);
      const hasGeo = hasCoords || !!address;

      const input = {
        destinationId: this.destinationId(),
        name: this.name().trim(),
        checkIn: this.checkIn(),
        checkOut: this.checkOut(),
        ...(address ? { address } : {}),
        ...(phone ? { phone } : {}),
        ...(email ? { email } : {}),
        ...(web ? { web } : {}),
        ...(confirmationCode ? { confirmationCode } : {}),
        ...(mapsUrl ? { mapsUrl } : {}),
        ...(hasPrice ? { price: createMoney(Math.round(amount * 100), this.priceCurrency()) } : {}),
        ...(hasGeo
          ? {
              geo: {
                ...(hasCoords ? { lat, lng } : {}),
                ...(address ? { address } : {}),
              },
            }
          : {}),
        ...(notes ? { notes } : {}),
      };

      let hotel: Hotel | undefined;
      if (this.isEditMode() && this.editingHotel) {
        await this.hotelService.update(this.editingHotel, input);
        hotel = this.editingHotel;
      } else {
        hotel = await this.hotelService.create(input);
      }

      if (this.hotelService.error()) {
        this.formError.set(this.hotelService.error());
        return;
      }

      if (hotel) await this.uploadPendingFiles(hotel.id);

      await this.router.navigate([
        '/tabs/trips',
        this.tripId(),
        'destinations',
        this.destinationId(),
        'lodging',
      ]);
    } finally {
      this.saving.set(false);
    }
  }

  async cancel(): Promise<void> {
    await this.router.navigate([
      '/tabs/trips',
      this.tripId(),
      'destinations',
      this.destinationId(),
      'lodging',
    ]);
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    if (files.length === 0) return;
    this.pendingFiles.set([...this.pendingFiles(), ...files]);
    input.value = '';
  }

  removePendingFile(file: File): void {
    this.pendingFiles.set(this.pendingFiles().filter((candidate) => candidate !== file));
  }

  async openAttachedFile(doc: TravelDocument): Promise<void> {
    const url = await this.documentService.openUrl(doc.id);
    if (url) window.open(url, '_blank');
  }

  async removeAttachedFile(doc: TravelDocument): Promise<void> {
    await this.documentService.softDelete(doc.id, this.tripId());
    this.attachedFiles.set(this.attachedFiles().filter((candidate) => candidate.id !== doc.id));
  }

  private async loadAttachedFiles(tripId: string, hotelId: string): Promise<void> {
    await this.documentService.load(tripId);
    this.attachedFiles.set(
      this.documentService
        .documents()
        .filter((doc) => doc.entityRef?.type === 'hotel' && doc.entityRef.id === hotelId),
    );
  }

  private async uploadPendingFiles(hotelId: string): Promise<void> {
    const files = this.pendingFiles();
    if (files.length === 0) return;

    this.uploadingFiles.set(true);
    try {
      for (const file of files) {
        await this.documentService.upload({
          travelId: this.tripId(),
          title: file.name,
          category: 'hotels',
          blob: file,
          fileName: file.name,
          mimeType: file.type || 'application/octet-stream',
          entityRef: { type: 'hotel', id: hotelId },
        });
      }
      this.pendingFiles.set([]);
    } finally {
      this.uploadingFiles.set(false);
    }
  }
}
