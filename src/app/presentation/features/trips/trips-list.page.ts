import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { IonHeader, IonToolbar, IonTitle, IonIcon, IonContent, IonFab, IonFabButton } from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import { add, airplane } from 'ionicons/icons';

import { TravelService } from '../../../application/services/travel.service';
import type { Travel } from '../../../domain/entities/travel';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import {
  TripCardComponent,
  type TripCardViewModel,
  type TripCardStatus,
} from '../../shared/components/trip-card/trip-card.component';
import { classifyDateRange, formatDateRange } from '../../shared/utils/date-format.util';

/**
 * Trips list (design §D2 — fixes MUST-FIX #2: broken empty cover gradient +
 * orphan floating trash icon). Groups trips into UPCOMING/ACTIVE and PAST.
 * Each trip renders via the shared `TripCardComponent`, whose cover always
 * shows a gradient (derived from `Travel.color` or a deterministic
 * fallback) with the title/dates overlaid, a status chip, and delete
 * behind a confirm-guarded ⋯ action sheet — never an inline trash icon.
 */
@Component({
  selector: 'app-trips-list',
  templateUrl: './trips-list.page.html',
  styleUrl: './trips-list.page.scss',
  imports: [
    RouterLink,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonIcon,
    IonContent,
    IonFab,
    IonFabButton,
    TripCardComponent,
    EmptyStateComponent,
    TranslatePipe,
  ],
})
export class TripsListPage implements OnInit {
  protected readonly travelService = inject(TravelService);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);

  /** Object URLs for uploaded cover photos, keyed by trip id — revoked on destroy. */
  private readonly coverImageUrls = signal<Record<string, string>>({});
  private readonly openedUrls: string[] = [];

  protected readonly loaded = signal(false);

  protected readonly upcomingTrips = computed(() =>
    this.travelService
      .trips()
      .filter((trip) => !this.isPast(trip))
      .sort((a, b) => new Date(a.dates.start).getTime() - new Date(b.dates.start).getTime())
      .map((trip) => this.toViewModel(trip)),
  );

  protected readonly pastTrips = computed(() =>
    this.travelService
      .trips()
      .filter((trip) => this.isPast(trip))
      .sort((a, b) => new Date(b.dates.end).getTime() - new Date(a.dates.end).getTime())
      .map((trip) => this.toViewModel(trip)),
  );

  constructor() {
    addIcons({ add, airplane });
    this.destroyRef.onDestroy(() => {
      for (const url of this.openedUrls) URL.revokeObjectURL(url);
    });
  }

  async ngOnInit(): Promise<void> {
    await this.travelService.load();
    await this.loadCoverImages();
    this.loaded.set(true);
  }

  private async loadCoverImages(): Promise<void> {
    const withCovers = this.travelService.trips().filter((trip) => trip.coverImageId);
    const entries = await Promise.all(
      withCovers.map(async (trip) => {
        const url = await this.travelService.getCoverImageUrl(trip);
        return url ? ([trip.id, url] as const) : undefined;
      }),
    );
    const resolved = entries.filter((entry): entry is readonly [string, string] => !!entry);
    for (const [, url] of resolved) this.openedUrls.push(url);
    this.coverImageUrls.set(Object.fromEntries(resolved));
  }

  async goToNewTrip(): Promise<void> {
    await this.router.navigate(['/tabs/trips/new']);
  }

  async editTrip(tripId: string): Promise<void> {
    await this.router.navigate(['/tabs/trips', tripId, 'edit']);
  }

  async deleteTrip(tripId: string): Promise<void> {
    await this.travelService.softDelete(tripId);
  }

  private toViewModel(trip: Travel): TripCardViewModel {
    const status = this.statusOf(trip);
    return {
      id: trip.id,
      title: trip.title,
      dateRangeLabel: formatDateRange(trip.dates.start, trip.dates.end, this.translate.currentLang(), (days) =>
        this.translate.instant(days === 1 ? 'common.durationDay' : 'common.durationDays', { count: days }),
      ),
      status,
      statusLabel: this.translate.instant(`trips.status.${status}`),
      ...(trip.color ? { color: trip.color } : {}),
      ...(this.coverImageUrls()[trip.id] ? { coverImageUrl: this.coverImageUrls()[trip.id] } : {}),
    };
  }

  private statusOf(trip: Travel): TripCardStatus {
    const status = classifyDateRange(trip.dates.start, trip.dates.end);
    return status === 'ongoing' ? 'active' : status;
  }

  private isPast(trip: Travel): boolean {
    return classifyDateRange(trip.dates.start, trip.dates.end) === 'past';
  }
}
