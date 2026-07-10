import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
  type ViewWillEnter,
} from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import {
  settingsOutline,
  locationOutline,
  bedOutline,
  alarmOutline,
  checkboxOutline,
  airplane,
  walletOutline,
  folderOutline,
} from 'ionicons/icons';

import { ChecklistService } from '../../../application/services/checklist.service';
import { DestinationService } from '../../../application/services/destination.service';
import { HotelService } from '../../../application/services/hotel.service';
import { ReminderService } from '../../../application/services/reminder.service';
import { TransportService } from '../../../application/services/transport.service';
import { TravelService } from '../../../application/services/travel.service';
import type { Travel } from '../../../domain/entities/travel';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import {
  TimelineComponent,
  type TimelineItem,
} from '../../shared/components/timeline/timeline.component';
import { AppDateRangePipe } from '../../shared/pipes/app-date.pipe';
import { countryDisplayLabel } from '../../shared/utils/country-display.util';
import {
  classifyDateRange,
  daysBetweenInclusive,
  isTodayOrLater,
  todayDateOnly,
} from '../../shared/utils/date-format.util';
import { destinationLink } from '../../shared/utils/timeline-link.util';
import { ticketLabel, transportMeta } from '../../shared/utils/transport-display.util';
import { TRANSPORT_ICONS } from '../../shared/utils/transport-icon.util';
import { tripCoverGradient } from '../../shared/utils/trip-color.util';

/** Keeps the "Coming up" preview uncluttered for non-technical users. */
const UPCOMING_LIMIT = 5;

/**
 * Today home (design §D1 — fixes MUST-FIX #3: rebuilds the bare
 * title+plain-lines layout into a hero + digestible previews + one clear
 * set of quick actions). The hero always shows the active/next trip so
 * "+ Add expense" / "+ Add file" always carry trip context — they route
 * into that trip's own Expenses/Documents sections
 * (`/tabs/trips/:id/expenses|documents`), the same nested route that
 * powers uploads there, so `DocumentsPage`/`ExpensesPage` always resolve a
 * real `tripId` from `route.parent`. When there is no trip yet, the
 * friendly empty state guides the traveler to create one instead of
 * showing broken/context-less actions.
 */
@Component({
  selector: 'app-today',
  templateUrl: './today.page.html',
  styleUrl: './today.page.scss',
  imports: [
    RouterLink,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonContent,
    TimelineComponent,
    EmptyStateComponent,
    TranslatePipe,
    AppDateRangePipe,
  ],
})
export class TodayPage implements OnInit, ViewWillEnter {
  protected readonly travelService = inject(TravelService);
  protected readonly reminderService = inject(ReminderService);
  protected readonly checklistService = inject(ChecklistService);
  private readonly destinationService = inject(DestinationService);
  private readonly hotelService = inject(HotelService);
  private readonly transportService = inject(TransportService);
  private readonly translate = inject(TranslateService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly loaded = signal(false);
  protected readonly upcomingItems = signal<TimelineItem[]>([]);
  protected readonly hasChecklistData = signal(false);
  /** Object URL for the active trip's cover photo, if one was uploaded. */
  protected readonly heroCoverImageUrl = signal<string | undefined>(undefined);
  private openedHeroUrl: string | undefined;

  protected readonly activeTrip = computed<Travel | undefined>(() => {
    const trips = this.travelService.trips();

    const ongoing = trips.find(
      (trip) => classifyDateRange(trip.dates.start, trip.dates.end) === 'ongoing',
    );
    if (ongoing) return ongoing;

    return [...trips]
      .filter((trip) => classifyDateRange(trip.dates.start, trip.dates.end) === 'upcoming')
      .sort((a, b) => new Date(a.dates.start).getTime() - new Date(b.dates.start).getTime())[0];
  });

  protected readonly isTripOngoing = computed(() => {
    const trip = this.activeTrip();
    if (!trip) return false;
    return classifyDateRange(trip.dates.start, trip.dates.end) === 'ongoing';
  });

  protected readonly tripProgressLabel = computed<string | null>(() => {
    const trip = this.activeTrip();
    if (!trip || !this.isTripOngoing()) return null;
    const totalDays = daysBetweenInclusive(trip.dates.start, trip.dates.end);
    const dayIndex = Math.min(
      totalDays,
      Math.max(1, daysBetweenInclusive(trip.dates.start, todayDateOnly())),
    );
    return this.translate.instant('today.dayProgress', { day: dayIndex, total: totalDays });
  });

  protected readonly checklistDone = computed(
    () => this.checklistService.items().length - this.checklistService.pendingCount(),
  );
  protected readonly checklistTotal = computed(() => this.checklistService.items().length);
  protected readonly checklistPercent = computed(() => {
    const total = this.checklistTotal();
    return total === 0 ? 0 : Math.round((this.checklistDone() / total) * 100);
  });

  constructor() {
    addIcons({
      settingsOutline,
      locationOutline,
      bedOutline,
      alarmOutline,
      checkboxOutline,
      airplane,
      walletOutline,
      folderOutline,
    });
    this.destroyRef.onDestroy(() => {
      if (this.openedHeroUrl) URL.revokeObjectURL(this.openedHeroUrl);
    });
  }

  async ngOnInit(): Promise<void> {
    await this.travelService.load();
    const trip = this.activeTrip();

    if (!trip) {
      this.loaded.set(true);
      return;
    }

    await Promise.all([
      this.loadUpcoming(trip.id),
      this.reminderService.checkDue(),
      this.loadChecklist(trip.id),
      this.loadHeroCoverImage(trip),
    ]);
    this.loaded.set(true);
  }

  /**
   * Ionic caches/reuses page instances (`IonicRouteStrategy`), so
   * `ngOnInit` does NOT re-run on back-navigation — re-resolving the cover
   * URL here on every (re)entry ensures the hero shows a just-uploaded
   * cover photo without a manual reload. Revokes the previous object URL
   * before creating a new one so we never leak or double-create URLs.
   */
  async ionViewWillEnter(): Promise<void> {
    if (!this.loaded()) return; // first entry: ngOnInit's Promise.all already loads it
    const trip = this.activeTrip();
    if (!trip) {
      if (this.openedHeroUrl) URL.revokeObjectURL(this.openedHeroUrl);
      this.openedHeroUrl = undefined;
      this.heroCoverImageUrl.set(undefined);
      return;
    }
    await this.loadHeroCoverImage(trip);
  }

  private async loadHeroCoverImage(trip: Travel): Promise<void> {
    const url = await this.travelService.getCoverImageUrl(trip);
    if (this.openedHeroUrl) URL.revokeObjectURL(this.openedHeroUrl);
    this.openedHeroUrl = url;
    this.heroCoverImageUrl.set(url);
  }

  protected greeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return this.translate.instant('today.greetingMorning');
    if (hour < 18) return this.translate.instant('today.greetingAfternoon');
    return this.translate.instant('today.greetingEvening');
  }

  protected heroGradient(trip: Travel): string {
    return tripCoverGradient(trip.id, trip.color);
  }

  async goToNewTrip(): Promise<void> {
    await this.router.navigate(['/tabs/trips/new']);
  }

  private async loadUpcoming(tripId: string): Promise<void> {
    await this.destinationService.load(tripId);
    const destinations = this.destinationService.destinations();

    const destinationItems: TimelineItem[] = destinations
      .filter((destination) => isTodayOrLater(destination.arrival))
      .map((destination) => {
        const country = countryDisplayLabel(
          destination.countryCode,
          destination.country,
          this.translate.currentLang(),
        );
        return {
          id: `destination-${destination.id}`,
          category: 'destination' as const,
          icon: 'location-outline',
          date: destination.arrival,
          label: this.translate.instant('today.arrive', { name: destination.name }),
          link: destinationLink(tripId, destination.id),
          ...(country ? { meta: country } : {}),
        };
      });

    const hotelLists = await Promise.all(
      destinations.map((destination) => this.hotelService.listFor(destination.id)),
    );
    const lodgingItems: TimelineItem[] = [];
    for (const hotels of hotelLists) {
      for (const hotel of hotels) {
        const link = destinationLink(tripId, hotel.destinationId);
        if (isTodayOrLater(hotel.checkIn)) {
          lodgingItems.push({
            id: `checkin-${hotel.id}`,
            category: 'lodging',
            icon: 'bed-outline',
            date: hotel.checkIn,
            label: this.translate.instant('today.checkIn', { name: hotel.name }),
            link,
          });
        }
        if (isTodayOrLater(hotel.checkOut)) {
          lodgingItems.push({
            id: `checkout-${hotel.id}`,
            category: 'lodging',
            icon: 'bed-outline',
            date: hotel.checkOut,
            label: this.translate.instant('today.checkOut', { name: hotel.name }),
            link,
          });
        }
      }
    }

    const transportLists = await Promise.all(
      destinations.map((destination) => this.transportService.listFor(destination.id)),
    );
    const transportItems: TimelineItem[] = [];
    for (const transports of transportLists) {
      for (const transport of transports) {
        const typeLabel = this.translate.instant(`transport.types.${transport.type}`);
        const meta = transportMeta(transport);
        const link = destinationLink(tripId, transport.destinationId);
        if (transport.departAt && isTodayOrLater(transport.departAt)) {
          transportItems.push({
            id: `depart-transport-${transport.id}`,
            category: 'transport',
            icon: TRANSPORT_ICONS[transport.type],
            date: transport.departAt,
            label: ticketLabel(
              transport,
              this.translate.instant('today.transportDepart', { type: typeLabel }),
            ),
            link,
            ...(meta ? { meta } : {}),
          });
        }
        if (transport.arriveAt && isTodayOrLater(transport.arriveAt)) {
          transportItems.push({
            id: `arrive-transport-${transport.id}`,
            category: 'transport',
            icon: TRANSPORT_ICONS[transport.type],
            date: transport.arriveAt,
            label: ticketLabel(
              transport,
              this.translate.instant('today.transportArrive', { type: typeLabel }),
            ),
            link,
            ...(meta ? { meta } : {}),
          });
        }
      }
    }

    this.upcomingItems.set(
      [...destinationItems, ...lodgingItems, ...transportItems]
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(0, UPCOMING_LIMIT),
    );
  }

  private async loadChecklist(tripId: string): Promise<void> {
    await this.checklistService.load(tripId);
    this.hasChecklistData.set(this.checklistService.checklists().length > 0);
  }
}
