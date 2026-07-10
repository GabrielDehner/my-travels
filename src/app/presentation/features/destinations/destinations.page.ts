import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  IonIcon,
  IonFab,
  IonFabButton,
  IonButton,
  ActionSheetController,
  AlertController,
} from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import {
  add,
  trashOutline,
  createOutline,
  ellipsisHorizontal,
  bedOutline,
  locationOutline,
} from 'ionicons/icons';

import { DestinationService } from '../../../application/services/destination.service';
import { HotelService } from '../../../application/services/hotel.service';
import type { Destination } from '../../../domain/entities/destination';
import type { Hotel } from '../../../domain/entities/hotel';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { AppDatePipe, AppDateRangePipe } from '../../shared/pipes/app-date.pipe';
import { CountryDisplayPipe } from '../../shared/pipes/country-display.pipe';
import { tripId$ } from '../../shared/utils/trip-route.util';

/**
 * Destinations timeline — lists a trip's Destinations in chronological order
 * (by arrival, then `order` as a tie-breaker) with an inline lodging line
 * per destination (its Hotels' name + check-in time), per design §13.
 * Create/edit/soft-delete Destinations; per-destination "manage lodging"
 * link routes into the Lodging feature (design §12).
 */
@Component({
  selector: 'app-destinations',
  templateUrl: './destinations.page.html',
  styleUrl: './destinations.page.scss',
  imports: [
    RouterLink,
    IonIcon,
    IonFab,
    IonFabButton,
    IonButton,
    EmptyStateComponent,
    TranslatePipe,
    AppDatePipe,
    AppDateRangePipe,
    CountryDisplayPipe,
  ],
})
export class DestinationsPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly destinationService = inject(DestinationService);
  private readonly hotelService = inject(HotelService);
  private readonly actionSheetCtrl = inject(ActionSheetController);
  private readonly alertCtrl = inject(AlertController);
  private readonly translate = inject(TranslateService);

  protected readonly tripId = signal('');
  protected readonly lodgingByDestination = signal<Record<string, Hotel[]>>({});

  protected readonly timeline = computed(() =>
    [...this.destinationService.destinations()].sort((a, b) => {
      const byArrival = new Date(a.arrival).getTime() - new Date(b.arrival).getTime();
      return byArrival !== 0 ? byArrival : a.order - b.order;
    }),
  );

  constructor() {
    addIcons({ add, trashOutline, createOutline, ellipsisHorizontal, bedOutline, locationOutline });
  }

  ngOnInit(): void {
    // Reactive resolution (fix: robust `tripId` — see trip-route.util.ts).
    tripId$(this.route)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((id) => {
        this.tripId.set(id);
        void this.destinationService.load(id).then(() => this.loadLodgingLines());
      });
  }

  protected lodgingFor(destination: Destination): Hotel[] {
    return this.lodgingByDestination()[destination.id] ?? [];
  }

  async goToNewDestination(): Promise<void> {
    await this.router.navigate(['/tabs/trips', this.tripId(), 'destinations', 'new']);
  }

  /**
   * Destructive actions live behind an overflow menu with a confirm dialog
   * (fix MEDIUM #7 — no more orphan always-visible inline trash icon).
   */
  async openDestinationMenu(event: Event, destination: Destination): Promise<void> {
    event.stopPropagation();
    const sheet = await this.actionSheetCtrl.create({
      header: destination.name,
      buttons: [
        {
          text: this.translate.instant('common.edit'),
          icon: 'create-outline',
          handler: () =>
            this.router.navigate([
              '/tabs/trips',
              this.tripId(),
              'destinations',
              destination.id,
              'edit',
            ]),
        },
        {
          text: this.translate.instant('common.delete'),
          icon: 'trash-outline',
          role: 'destructive',
          htmlAttributes: { style: { color: 'var(--app-danger)' } },
          handler: () => this.confirmDeleteDestination(destination),
        },
        { text: this.translate.instant('common.cancel'), role: 'cancel' },
      ],
    });
    await sheet.present();
  }

  private async confirmDeleteDestination(destination: Destination): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: this.translate.instant('destinations.deleteConfirmTitle'),
      message: this.translate.instant('destinations.deleteConfirmMessage', {
        name: destination.name,
      }),
      buttons: [
        { text: this.translate.instant('common.cancel'), role: 'cancel' },
        {
          text: this.translate.instant('common.delete'),
          role: 'destructive',
          handler: () => this.deleteDestination(destination),
        },
      ],
    });
    await alert.present();
  }

  private async deleteDestination(destination: Destination): Promise<void> {
    await this.destinationService.softDelete(destination.id, this.tripId());
    await this.loadLodgingLines();
  }

  private async loadLodgingLines(): Promise<void> {
    const entries = await Promise.all(
      this.destinationService.destinations().map(async (destination) => {
        const hotels = await this.hotelService.listFor(destination.id);
        return [destination.id, hotels] as const;
      }),
    );
    this.lodgingByDestination.set(Object.fromEntries(entries));
  }
}
