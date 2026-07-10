import { Component, OnInit, computed, inject, signal } from '@angular/core';
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
  IonSegment,
  IonSegmentButton,
  IonIcon,
  type SegmentCustomEvent,
} from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import { cloudUploadOutline, documentAttachOutline, trashOutline } from 'ionicons/icons';

import { DocumentService } from '../../../application/services/document.service';
import { TransportService } from '../../../application/services/transport.service';
import type { Transport } from '../../../domain/entities/transport';
import type { TravelDocument } from '../../../domain/entities/travel-document';
import type { TransportType } from '../../../domain/enums/transport-type';
import { resolveTripId } from '../../shared/utils/trip-route.util';

const TRANSPORT_TYPES: readonly TransportType[] = ['flight', 'train', 'bus', 'car', 'ferry', 'other'];

type ReservationMode = 'file' | 'link';

/**
 * Ticket/pasaje create/edit form — reused for both
 * `/trips/:id/destinations/:destinationId/tickets/new` (no transport id) and
 * `/trips/:id/destinations/:destinationId/tickets/:transportId/edit`, per
 * design "Ticket modeling" ADR. Kept deliberately simple for non-technical
 * users: an obvious file-or-link toggle for the reservation and minimal
 * required fields (only the ticket type).
 */
@Component({
  selector: 'app-ticket-form',
  templateUrl: './ticket-form.page.html',
  styleUrl: './ticket-form.page.scss',
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
    IonSegment,
    IonSegmentButton,
    IonIcon,
    TranslatePipe,
  ],
})
export class TicketFormPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly transportService = inject(TransportService);
  private readonly documentService = inject(DocumentService);
  private readonly translate = inject(TranslateService);

  protected readonly types = TRANSPORT_TYPES;

  /**
   * Pre-resolved type labels. Rendering the collapsed `ion-select` display
   * value via the `translate` pipe inside `ion-select-option` surfaces the
   * raw key (e.g. "transport.types.flight") instead of the translated text —
   * same Ionic collapsed-display issue fixed for trip-form status and
   * documents category. Resolving with `translate.instant` into static
   * option text avoids that. Reads `currentLang()` so labels re-translate on
   * runtime language switch.
   */
  protected readonly typeOptions = computed(() => {
    this.translate.currentLang();
    return TRANSPORT_TYPES.map((value) => ({
      value,
      label: this.translate.instant(`transport.types.${value}`),
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
   * stays correct on cold load AND re-translates on language switch.
   */
  protected readonly selectedTypeLabel = computed(() => {
    const current = this.type();
    return this.typeOptions().find((option) => option.value === current)?.label ?? '';
  });

  protected readonly tripId = signal('');
  protected readonly destinationId = signal('');

  protected readonly type = signal<TransportType>('flight');
  protected readonly title = signal('');
  protected readonly company = signal('');
  protected readonly number = signal('');
  protected readonly departAt = signal('');
  protected readonly arriveAt = signal('');
  protected readonly seat = signal('');
  protected readonly notes = signal('');

  // Reservation is EITHER a file OR a link (design "Reservation = file OR
  // link"); both are optional, the toggle just picks which input is shown.
  protected readonly reservationMode = signal<ReservationMode>('file');
  protected readonly bookingUrl = signal('');
  protected readonly attachedFile = signal<TravelDocument | null>(null);
  protected readonly pendingFile = signal<File | null>(null);

  // Terminal location (design "Terminal + lodging location") — address
  // and/or coordinates, same convention as the Lodging form.
  protected readonly terminalAddress = signal('');
  protected readonly terminalLatitude = signal('');
  protected readonly terminalLongitude = signal('');

  // Pasted Google Maps share link (feature: pasteable Google Maps link) —
  // when present, "Cómo llegar" opens THIS exact link instead of one built
  // from the terminal address/coordinates (design maps.util `resolveMapsUrl`).
  protected readonly mapsUrl = signal('');

  protected readonly isEditMode = signal(false);
  protected readonly saving = signal(false);
  protected readonly formError = signal<string | null>(null);

  private editingTransport: Transport | null = null;

  constructor() {
    addIcons({ cloudUploadOutline, documentAttachOutline, trashOutline });
  }

  async ngOnInit(): Promise<void> {
    // Robust nearest-ancestor resolution (fix — see trip-route.util.ts).
    const tripId = resolveTripId(this.route);
    this.tripId.set(tripId);
    const destinationId = this.route.snapshot.paramMap.get('destinationId') ?? '';
    this.destinationId.set(destinationId);

    const transportId = this.route.snapshot.paramMap.get('transportId');
    if (!transportId) return;

    this.isEditMode.set(true);
    await this.transportService.load(destinationId);
    const transport = this.transportService
      .transports()
      .find((candidate) => candidate.id === transportId);
    if (!transport) {
      this.formError.set(this.translate.instant('ticketForm.ticketNotFound'));
      return;
    }

    this.editingTransport = transport;
    this.type.set(transport.type);
    this.title.set(transport.title ?? '');
    this.company.set(transport.company ?? '');
    this.number.set(transport.number ?? '');
    this.departAt.set(transport.departAt ?? '');
    this.arriveAt.set(transport.arriveAt ?? '');
    this.seat.set(transport.seat ?? '');
    this.notes.set(transport.notes ?? '');
    this.terminalAddress.set(transport.terminal?.address ?? '');
    this.terminalLatitude.set(transport.terminal?.lat != null ? String(transport.terminal.lat) : '');
    this.terminalLongitude.set(transport.terminal?.lng != null ? String(transport.terminal.lng) : '');
    this.mapsUrl.set(transport.mapsUrl ?? '');

    if (transport.bookingUrl) {
      this.reservationMode.set('link');
      this.bookingUrl.set(transport.bookingUrl);
    } else {
      this.reservationMode.set('file');
      await this.loadAttachedFile(tripId, transport.id);
    }
  }

  async save(): Promise<void> {
    this.formError.set(null);

    this.saving.set(true);
    try {
      const title = this.title().trim();
      const company = this.company().trim();
      const number = this.number().trim();
      const departAt = this.departAt().trim();
      const arriveAt = this.arriveAt().trim();
      const seat = this.seat().trim();
      const notes = this.notes().trim();
      const terminalAddress = this.terminalAddress().trim();
      const mapsUrl = this.mapsUrl().trim();
      const lat = Number.parseFloat(this.terminalLatitude());
      const lng = Number.parseFloat(this.terminalLongitude());
      const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);
      const hasTerminal = hasCoords || !!terminalAddress;
      const bookingUrl =
        this.reservationMode() === 'link' ? this.bookingUrl().trim() : undefined;

      const input = {
        destinationId: this.destinationId(),
        type: this.type(),
        ...(title ? { title } : {}),
        ...(bookingUrl ? { bookingUrl } : {}),
        ...(company ? { company } : {}),
        ...(number ? { number } : {}),
        ...(departAt ? { departAt } : {}),
        ...(arriveAt ? { arriveAt } : {}),
        ...(seat ? { seat } : {}),
        ...(notes ? { notes } : {}),
        ...(mapsUrl ? { mapsUrl } : {}),
        ...(hasTerminal
          ? {
              terminal: {
                ...(hasCoords ? { lat, lng } : {}),
                ...(terminalAddress ? { address: terminalAddress } : {}),
              },
            }
          : {}),
      };

      let transport: Transport | undefined;
      if (this.isEditMode() && this.editingTransport) {
        await this.transportService.update(this.editingTransport, input);
        transport = this.editingTransport;
      } else {
        transport = await this.transportService.create(input);
      }

      if (this.transportService.error()) {
        this.formError.set(this.transportService.error());
        return;
      }

      if (transport && this.reservationMode() === 'file') {
        await this.uploadPendingFile(transport.id);
      }

      await this.goBackToDetail();
    } finally {
      this.saving.set(false);
    }
  }

  async cancel(): Promise<void> {
    await this.goBackToDetail();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.pendingFile.set(input.files?.[0] ?? null);
  }

  onReservationModeChange(event: SegmentCustomEvent): void {
    const value = event.detail.value;
    if (value === 'file' || value === 'link') {
      this.reservationMode.set(value);
    }
  }

  async openAttachedFile(): Promise<void> {
    const doc = this.attachedFile();
    if (!doc) return;
    const url = await this.documentService.openUrl(doc.id);
    if (url) window.open(url, '_blank');
  }

  private async goBackToDetail(): Promise<void> {
    await this.router.navigate([
      '/tabs/trips',
      this.tripId(),
      'destinations',
      this.destinationId(),
    ]);
  }

  private async loadAttachedFile(tripId: string, transportId: string): Promise<void> {
    await this.documentService.load(tripId);
    const doc = this.documentService
      .documents()
      .find((candidate) => candidate.entityRef?.type === 'transport' && candidate.entityRef.id === transportId);
    this.attachedFile.set(doc ?? null);
  }

  private async uploadPendingFile(transportId: string): Promise<void> {
    const file = this.pendingFile();
    if (!file) return;

    await this.documentService.upload({
      travelId: this.tripId(),
      title: file.name,
      category: 'tickets',
      blob: file,
      fileName: file.name,
      mimeType: file.type || 'application/octet-stream',
      entityRef: { type: 'transport', id: transportId },
    });
    this.pendingFile.set(null);
  }
}
