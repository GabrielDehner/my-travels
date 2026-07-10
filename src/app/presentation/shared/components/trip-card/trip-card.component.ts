import { Component, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonIcon,
  IonButton,
  ActionSheetController,
  AlertController,
} from '@ionic/angular/standalone';
import { TranslateService } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import { airplane, ellipsisHorizontal, createOutline, trashOutline } from 'ionicons/icons';

import { tripCoverGradient } from '../../utils/trip-color.util';

/** Status chip variant driving color (design §C2 / §C7). */
export type TripCardStatus = 'active' | 'upcoming' | 'past';

/** Plain @Input view-model — no domain/application imports (dependency-cruiser). */
export interface TripCardViewModel {
  readonly id: string;
  readonly title: string;
  readonly dateRangeLabel: string;
  readonly status: TripCardStatus;
  readonly statusLabel: string;
  readonly color?: string;
  readonly metaLabel?: string;
  /** Object URL for an uploaded cover photo. Falls back to the color gradient when absent. */
  readonly coverImageUrl?: string;
}

/**
 * Trip card (design §C2 — fixes problem #2: broken empty cover gradient +
 * orphan floating trash). Cover is always a gradient derived from
 * `trip.color` (or a deterministic fallback) with the title + dates
 * overlaid, so it never looks empty/broken. Delete lives behind the ⋯
 * action sheet (never an inline floating icon) and always confirms first.
 */
@Component({
  selector: 'app-trip-card',
  standalone: true,
  imports: [RouterLink, IonIcon, IonButton],
  template: `
    <div class="trip-card app-card app-card--raised app-card--interactive" [class.trip-card--past]="trip().status === 'past'">
      <a
        class="trip-card__cover"
        [routerLink]="['/tabs/trips', trip().id]"
        [style.background]="trip().coverImageUrl ? null : coverGradient()"
      >
        @if (trip().coverImageUrl) {
          <img class="trip-card__cover-img" [src]="trip().coverImageUrl" alt="" />
        }
        <span class="trip-card__chip app-chip" [class]="'app-chip--' + chipVariant()" [class.app-chip--pulsing]="trip().status === 'active'">
          <span class="app-chip__dot"></span>
          {{ trip().statusLabel }}
        </span>
        @if (!trip().coverImageUrl) {
          <ion-icon name="airplane" class="trip-card__watermark" aria-hidden="true"></ion-icon>
        }
        <div class="trip-card__scrim">
          <h3 class="trip-card__title">{{ trip().title }}</h3>
          <p class="trip-card__dates">{{ trip().dateRangeLabel }}</p>
        </div>
      </a>
      <div class="trip-card__footer">
        @if (trip().metaLabel) {
          <p class="trip-card__meta">{{ trip().metaLabel }}</p>
        } @else {
          <span></span>
        }
        <ion-button fill="clear" size="small" class="trip-card__more app-icon-btn" (click)="openMenu($event)">
          <ion-icon slot="icon-only" name="ellipsis-horizontal"></ion-icon>
        </ion-button>
      </div>
    </div>
  `,
  styleUrl: './trip-card.component.scss',
})
export class TripCardComponent {
  readonly trip = input.required<TripCardViewModel>();

  readonly editRequested = output<string>();
  readonly deleteRequested = output<string>();

  private readonly actionSheetCtrl = inject(ActionSheetController);
  private readonly alertCtrl = inject(AlertController);
  private readonly translate = inject(TranslateService);

  constructor() {
    addIcons({ airplane, ellipsisHorizontal, createOutline, trashOutline });
  }

  protected chipVariant(): string {
    switch (this.trip().status) {
      case 'active':
        return 'success';
      case 'upcoming':
        return 'info';
      default:
        return 'muted';
    }
  }

  protected coverGradient(): string {
    return tripCoverGradient(this.trip().id, this.trip().color);
  }

  async openMenu(event: Event): Promise<void> {
    event.stopPropagation();
    event.preventDefault();
    const sheet = await this.actionSheetCtrl.create({
      header: this.trip().title,
      buttons: [
        {
          text: this.translate.instant('common.edit'),
          icon: 'create-outline',
          handler: () => this.editRequested.emit(this.trip().id),
        },
        {
          text: this.translate.instant('common.delete'),
          icon: 'trash-outline',
          role: 'destructive',
          htmlAttributes: { style: { color: 'var(--app-danger)' } },
          handler: () => this.confirmDelete(),
        },
        {
          text: this.translate.instant('common.cancel'),
          role: 'cancel',
        },
      ],
    });
    await sheet.present();
  }

  private async confirmDelete(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: this.translate.instant('trips.deleteConfirmTitle'),
      message: this.translate.instant('trips.deleteConfirmMessage', { title: this.trip().title }),
      buttons: [
        { text: this.translate.instant('common.cancel'), role: 'cancel' },
        {
          text: this.translate.instant('common.delete'),
          role: 'destructive',
          handler: () => this.deleteRequested.emit(this.trip().id),
        },
      ],
    });
    await alert.present();
  }
}
