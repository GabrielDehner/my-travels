import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
  IonContent,
  IonIcon,
  IonButton,
  IonFab,
  IonFabButton,
  ActionSheetController,
  AlertController,
} from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import { add, trashOutline, createOutline, ellipsisHorizontal, bedOutline } from 'ionicons/icons';

import { HotelService } from '../../../application/services/hotel.service';
import type { Hotel } from '../../../domain/entities/hotel';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { AppDatePipe } from '../../shared/pipes/app-date.pipe';
import { tripId$ } from '../../shared/utils/trip-route.util';

/**
 * Lodging list — create/edit/list/soft-delete Hotel entries under a single
 * Destination (design §2, §5, §12 — Lodging is managed inline within the
 * Destinations area). Reached from the Destinations timeline's "Lodging"
 * link for a given destination.
 */
@Component({
  selector: 'app-lodging-list',
  templateUrl: './lodging-list.page.html',
  styleUrl: './lodging-list.page.scss',
  imports: [
    RouterLink,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonContent,
    IonIcon,
    IonButton,
    IonFab,
    IonFabButton,
    EmptyStateComponent,
    TranslatePipe,
    AppDatePipe,
  ],
})
export class LodgingListPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly hotelService = inject(HotelService);
  private readonly actionSheetCtrl = inject(ActionSheetController);
  private readonly alertCtrl = inject(AlertController);
  private readonly translate = inject(TranslateService);

  protected readonly tripId = signal('');
  protected readonly destinationId = signal('');

  constructor() {
    addIcons({ add, trashOutline, createOutline, ellipsisHorizontal, bedOutline });
  }

  ngOnInit(): void {
    // Reactive resolution (fix: robust `tripId` — see trip-route.util.ts).
    // `destinationId` is a param on THIS route (not an ancestor), so the
    // direct snapshot read remains correct and is left as-is.
    tripId$(this.route)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((tripId) => this.tripId.set(tripId));

    const destinationId = this.route.snapshot.paramMap.get('destinationId') ?? '';
    this.destinationId.set(destinationId);
    void this.hotelService.load(destinationId);
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

  /** Destructive actions live behind an overflow menu with a confirm dialog (fix MEDIUM #7). */
  async openHotelMenu(event: Event, hotel: Hotel): Promise<void> {
    event.stopPropagation();
    event.preventDefault();
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
          handler: () => this.confirmDeleteHotel(hotel),
        },
        { text: this.translate.instant('common.cancel'), role: 'cancel' },
      ],
    });
    await sheet.present();
  }

  private async confirmDeleteHotel(hotel: Hotel): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: this.translate.instant('lodging.deleteConfirmTitle'),
      message: this.translate.instant('lodging.deleteConfirmMessage', { name: hotel.name }),
      buttons: [
        { text: this.translate.instant('common.cancel'), role: 'cancel' },
        {
          text: this.translate.instant('common.delete'),
          role: 'destructive',
          handler: () => this.deleteHotel(hotel),
        },
      ],
    });
    await alert.present();
  }

  private async deleteHotel(hotel: Hotel): Promise<void> {
    await this.hotelService.softDelete(hotel.id, this.destinationId());
  }

  protected formatPrice(hotel: Hotel): string | null {
    if (!hotel.price) return null;
    return `${hotel.price.currency} ${(hotel.price.amountMinor / 100).toFixed(2)}`;
  }
}
