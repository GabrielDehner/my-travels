import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { DestinationService } from '../../../application/services/destination.service';
import { HotelService } from '../../../application/services/hotel.service';
import { TransportService } from '../../../application/services/transport.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import {
  TimelineComponent,
  type TimelineCategory,
  type TimelineItem,
} from '../../shared/components/timeline/timeline.component';
import { AppDatePipe } from '../../shared/pipes/app-date.pipe';
import { countryDisplayLabel } from '../../shared/utils/country-display.util';
import { destinationLink } from '../../shared/utils/timeline-link.util';
import { ticketLabel, transportMeta } from '../../shared/utils/transport-display.util';
import { TRANSPORT_ICONS } from '../../shared/utils/transport-icon.util';
import { tripId$ } from '../../shared/utils/trip-route.util';

/** A day's worth of itinerary items, grouped for display. */
interface ItineraryDay {
  readonly day: string;
  readonly items: TimelineItem[];
}

const ICON_BY_CATEGORY: Record<TimelineCategory, string> = {
  destination: 'location-outline',
  lodging: 'bed-outline',
  document: 'document-outline',
  expense: 'cash-outline',
  checklist: 'checkbox-outline',
  reminder: 'alarm-outline',
  transport: 'airplane-outline',
};

/**
 * Itinerary — read-only chronological, auto-ordered view interleaving every
 * dated MVP item: Destination arrival/departure, Hotel check-in/check-out,
 * and Transport/ticket depart/arrive (feature (a) — surfaces tickets on the
 * shared timeline). Attraction does not exist in the MVP and is correctly
 * absent. Grouped by calendar day, rendered via the shared timeline
 * component (task 7.2). Items without a date (e.g. an undated ticket) are
 * simply omitted — kept simple per design.
 */
@Component({
  selector: 'app-itinerary',
  templateUrl: './itinerary.page.html',
  styleUrl: './itinerary.page.scss',
  imports: [TimelineComponent, EmptyStateComponent, TranslatePipe, AppDatePipe],
})
export class ItineraryPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly destinationService = inject(DestinationService);
  private readonly hotelService = inject(HotelService);
  private readonly transportService = inject(TransportService);
  private readonly translate = inject(TranslateService);

  private readonly rawItems = signal<TimelineItem[]>([]);

  protected readonly days = computed<ItineraryDay[]>(() => {
    const sorted = [...this.rawItems()].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    const byDay = new Map<string, TimelineItem[]>();
    for (const item of sorted) {
      const day = item.date.slice(0, 10);
      const existing = byDay.get(day);
      if (existing) {
        existing.push(item);
      } else {
        byDay.set(day, [item]);
      }
    }

    return [...byDay.entries()].map(([day, items]) => ({ day, items }));
  });

  ngOnInit(): void {
    // Reactive resolution (fix: robust `tripId` — see trip-route.util.ts).
    tripId$(this.route)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((tripId) => void this.loadFor(tripId));
  }

  private async loadFor(tripId: string): Promise<void> {
    await this.destinationService.load(tripId);

    const destinations = this.destinationService.destinations();
    const items: TimelineItem[] = [];

    for (const destination of destinations) {
      const country = countryDisplayLabel(
        destination.countryCode,
        destination.country,
        this.translate.currentLang(),
      );
      const link = destinationLink(tripId, destination.id);
      items.push({
        id: `arrive-${destination.id}`,
        category: 'destination',
        icon: ICON_BY_CATEGORY.destination,
        date: destination.arrival,
        label: this.translate.instant('itinerary.arrive', { name: destination.name }),
        link,
        ...(country ? { meta: country } : {}),
      });
      items.push({
        id: `depart-${destination.id}`,
        category: 'destination',
        icon: ICON_BY_CATEGORY.destination,
        date: destination.departure,
        label: this.translate.instant('itinerary.depart', { name: destination.name }),
        link,
        ...(country ? { meta: country } : {}),
      });
    }

    const hotelLists = await Promise.all(
      destinations.map((destination) => this.hotelService.listFor(destination.id)),
    );
    for (const hotels of hotelLists) {
      for (const hotel of hotels) {
        const link = destinationLink(tripId, hotel.destinationId);
        items.push({
          id: `checkin-${hotel.id}`,
          category: 'lodging',
          icon: ICON_BY_CATEGORY.lodging,
          date: hotel.checkIn,
          label: this.translate.instant('itinerary.checkIn', { name: hotel.name }),
          link,
        });
        items.push({
          id: `checkout-${hotel.id}`,
          category: 'lodging',
          icon: ICON_BY_CATEGORY.lodging,
          date: hotel.checkOut,
          label: this.translate.instant('itinerary.checkOut', { name: hotel.name }),
          link,
        });
      }
    }

    const transportLists = await Promise.all(
      destinations.map((destination) => this.transportService.listFor(destination.id)),
    );
    for (const transports of transportLists) {
      for (const transport of transports) {
        const typeLabel = this.translate.instant(`transport.types.${transport.type}`);
        const meta = transportMeta(transport);
        const link = destinationLink(tripId, transport.destinationId);
        if (transport.departAt) {
          items.push({
            id: `depart-transport-${transport.id}`,
            category: 'transport',
            icon: TRANSPORT_ICONS[transport.type],
            date: transport.departAt,
            label: ticketLabel(
              transport,
              this.translate.instant('itinerary.transportDepart', { type: typeLabel }),
            ),
            link,
            ...(meta ? { meta } : {}),
          });
        }
        if (transport.arriveAt) {
          items.push({
            id: `arrive-transport-${transport.id}`,
            category: 'transport',
            icon: TRANSPORT_ICONS[transport.type],
            date: transport.arriveAt,
            label: ticketLabel(
              transport,
              this.translate.instant('itinerary.transportArrive', { type: typeLabel }),
            ),
            link,
            ...(meta ? { meta } : {}),
          });
        }
        // Undated tickets (no departAt/arriveAt) are simply omitted from the
        // chronological timeline — kept simple per design.
      }
    }

    this.rawItems.set(items);
  }
}
