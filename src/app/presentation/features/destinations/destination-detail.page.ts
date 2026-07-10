import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
  IonButton,
  IonContent,
  IonIcon,
  ActionSheetController,
  AlertController,
} from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import {
  add,
  airplaneOutline,
  bedOutline,
  boatOutline,
  busOutline,
  carOutline,
  createOutline,
  ellipsisHorizontal,
  helpCircleOutline,
  linkOutline,
  navigateOutline,
  openOutline,
  trainOutline,
  trashOutline,
} from 'ionicons/icons';

import { DestinationService } from '../../../application/services/destination.service';
import { DocumentService } from '../../../application/services/document.service';
import { HotelService } from '../../../application/services/hotel.service';
import { TransportService } from '../../../application/services/transport.service';
import type { Destination } from '../../../domain/entities/destination';
import type { Hotel } from '../../../domain/entities/hotel';
import type { Transport } from '../../../domain/entities/transport';
import type { TransportType } from '../../../domain/enums/transport-type';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { AppDatePipe } from '../../shared/pipes/app-date.pipe';
import { CountryDisplayPipe } from '../../shared/pipes/country-display.pipe';
import { hasMapsTarget, openInMaps, type MapsTarget } from '../../shared/utils/maps.util';
import { ticketLabel as resolveTicketLabel } from '../../shared/utils/transport-display.util';
import { TRANSPORT_ICONS } from '../../shared/utils/transport-icon.util';
import { tripId$ } from '../../shared/utils/trip-route.util';

/**
 * Destination (place) detail — composes a place's Lodging and Tickets
 * (destination-logistics design "Destination detail" ADR): one full page,
 * one `ion-content`, each item exposing its reservation (file/link) and a
 * "Cómo llegar" button when a location is known. Reached by tapping a place
 * in the Destinations timeline.
 */
@Component({
  selector: 'app-destination-detail',
  templateUrl: './destination-detail.page.html',
  styleUrl: './destination-detail.page.scss',
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonButton,
    IonContent,
    IonIcon,
    EmptyStateComponent,
    TranslatePipe,
    AppDatePipe,
    CountryDisplayPipe,
  ],
})
export class DestinationDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly destinationService = inject(DestinationService);
  protected readonly hotelService = inject(HotelService);
  protected readonly transportService = inject(TransportService);
  private readonly documentService = inject(DocumentService);
  private readonly actionSheetCtrl = inject(ActionSheetController);
  private readonly alertCtrl = inject(AlertController);
  private readonly translate = inject(TranslateService);

  protected readonly tripId = signal('');
  protected readonly destinationId = signal('');
  /** Gates the skeleton placeholder while lodging/tickets first load (global aesthetic polish). */
  protected readonly loaded = signal(false);

  protected readonly destination = computed<Destination | undefined>(() =>
    this.destinationService.destinations().find((d) => d.id === this.destinationId()),
  );

  constructor() {
    addIcons({
      add,
      airplaneOutline,
      bedOutline,
      boatOutline,
      busOutline,
      carOutline,
      createOutline,
      ellipsisHorizontal,
      helpCircleOutline,
      linkOutline,
      navigateOutline,
      openOutline,
      trainOutline,
      trashOutline,
    });
  }

  ngOnInit(): void {
    // Reactive resolution (fix: robust `tripId` — see trip-route.util.ts).
    tripId$(this.route)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((tripId) => {
        this.tripId.set(tripId);
        if (!tripId) return;
        void this.destinationService.load(tripId);
        void this.documentService.load(tripId);
      });

    const destinationId = this.route.snapshot.paramMap.get('destinationId') ?? '';
    this.destinationId.set(destinationId);
    void Promise.all([
      this.hotelService.load(destinationId),
      this.transportService.load(destinationId),
    ]).then(() => this.loaded.set(true));
  }

  protected transportIcon(type: TransportType): string {
    return TRANSPORT_ICONS[type];
  }

  /** Ticket row label: the ticket's own title when set, else its translated type. */
  protected ticketLabel(transport: Transport): string {
    return resolveTicketLabel(transport, this.translate.instant(`transport.types.${transport.type}`));
  }

  protected hasLodgingLocation(hotel: Hotel): boolean {
    return hasMapsTarget(this.lodgingMapsTarget(hotel));
  }

  protected getDirectionsToLodging(hotel: Hotel): void {
    openInMaps(this.lodgingMapsTarget(hotel), 'directions');
  }

  protected hasTerminalLocation(transport: Transport): boolean {
    return hasMapsTarget(this.terminalMapsTarget(transport));
  }

  protected getDirectionsToTerminal(transport: Transport): void {
    openInMaps(this.terminalMapsTarget(transport), 'directions');
  }

  private lodgingMapsTarget(hotel: Hotel): MapsTarget {
    return {
      ...(hotel.mapsUrl ? { mapsUrl: hotel.mapsUrl } : {}),
      ...(hotel.geo ? { geo: hotel.geo } : {}),
      ...(hotel.address ? { address: hotel.address } : {}),
      label: hotel.name,
    };
  }

  private terminalMapsTarget(transport: Transport): MapsTarget {
    return {
      ...(transport.mapsUrl ? { mapsUrl: transport.mapsUrl } : {}),
      ...(transport.terminal ? { geo: transport.terminal } : {}),
    };
  }

  protected attachedFileFor(entityType: 'hotel' | 'transport', id: string) {
    return this.documentService
      .documents()
      .find((doc) => doc.entityRef?.type === entityType && doc.entityRef.id === id);
  }

  protected async openReservationFile(documentId: string): Promise<void> {
    const url = await this.documentService.openUrl(documentId);
    if (url) window.open(url, '_blank');
  }

  protected openBookingLink(url: string): void {
    window.open(url, '_blank');
  }

  async goToNewLodging(): Promise<void> {
    await this.router.navigate([
      '/tabs/trips',
      this.tripId(),
      'destinations',
      this.destinationId(),
      'lodging',
      'new',
    ]);
  }

  async goToNewTicket(): Promise<void> {
    await this.router.navigate([
      '/tabs/trips',
      this.tripId(),
      'destinations',
      this.destinationId(),
      'tickets',
      'new',
    ]);
  }

  async openLodgingMenu(event: Event, hotel: Hotel): Promise<void> {
    event.stopPropagation();
    const sheet = await this.actionSheetCtrl.create({
      header: hotel.name,
      buttons: [
        {
          text: this.translate.instant('common.edit'),
          icon: 'create-outline',
          handler: () =>
            this.router.navigate([
              '/tabs/trips',
              this.tripId(),
              'destinations',
              this.destinationId(),
              'lodging',
              hotel.id,
              'edit',
            ]),
        },
        {
          text: this.translate.instant('common.delete'),
          icon: 'trash-outline',
          role: 'destructive',
          htmlAttributes: { style: { color: 'var(--app-danger)' } },
          handler: () => this.confirmDeleteLodging(hotel),
        },
        { text: this.translate.instant('common.cancel'), role: 'cancel' },
      ],
    });
    await sheet.present();
  }

  async openTicketMenu(event: Event, transport: Transport): Promise<void> {
    event.stopPropagation();
    const label = this.translate.instant(`transport.types.${transport.type}`);
    const sheet = await this.actionSheetCtrl.create({
      header: label,
      buttons: [
        {
          text: this.translate.instant('common.edit'),
          icon: 'create-outline',
          handler: () =>
            this.router.navigate([
              '/tabs/trips',
              this.tripId(),
              'destinations',
              this.destinationId(),
              'tickets',
              transport.id,
              'edit',
            ]),
        },
        {
          text: this.translate.instant('common.delete'),
          icon: 'trash-outline',
          role: 'destructive',
          htmlAttributes: { style: { color: 'var(--app-danger)' } },
          handler: () => this.confirmDeleteTicket(transport),
        },
        { text: this.translate.instant('common.cancel'), role: 'cancel' },
      ],
    });
    await sheet.present();
  }

  private async confirmDeleteLodging(hotel: Hotel): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: this.translate.instant('lodging.deleteConfirmTitle'),
      message: this.translate.instant('lodging.deleteConfirmMessage', { name: hotel.name }),
      buttons: [
        { text: this.translate.instant('common.cancel'), role: 'cancel' },
        {
          text: this.translate.instant('common.delete'),
          role: 'destructive',
          handler: () => this.hotelService.softDelete(hotel.id, this.destinationId()),
        },
      ],
    });
    await alert.present();
  }

  private async confirmDeleteTicket(transport: Transport): Promise<void> {
    const label = this.translate.instant(`transport.types.${transport.type}`);
    const alert = await this.alertCtrl.create({
      header: this.translate.instant('destinationDetail.deleteTicketConfirmTitle'),
      message: this.translate.instant('destinationDetail.deleteTicketConfirmMessage', { label }),
      buttons: [
        { text: this.translate.instant('common.cancel'), role: 'cancel' },
        {
          text: this.translate.instant('common.delete'),
          role: 'destructive',
          handler: () => this.transportService.softDelete(transport.id, this.destinationId()),
        },
      ],
    });
    await alert.present();
  }
}
