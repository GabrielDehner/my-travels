import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink, RouterOutlet } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
  IonButton,
  IonIcon,
  IonContent,
} from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import {
  createOutline,
  locationOutline,
  location,
  timeOutline,
  time,
  bedOutline,
  bed,
  folderOutline,
  folder,
  checkboxOutline,
  checkbox,
  walletOutline,
  wallet,
} from 'ionicons/icons';

import { TravelService } from '../../../application/services/travel.service';
import {
  SectionNavComponent,
  type SectionNavItem,
} from '../../shared/components/section-nav/section-nav.component';
import { AppDateRangePipe } from '../../shared/pipes/app-date.pipe';

const TRIP_SEGMENTS = ['destinations', 'itinerary', 'documents', 'checklists', 'expenses'] as const;

/** Icon + plain-language label per section (design §B, §C5). */
const SECTION_NAV_ITEMS: readonly SectionNavItem[] = [
  {
    value: 'destinations',
    icon: 'location-outline',
    activeIcon: 'location',
    labelKey: 'tripDetail.segments.destinations',
  },
  {
    value: 'itinerary',
    icon: 'time-outline',
    activeIcon: 'time',
    labelKey: 'tripDetail.segments.itinerary',
  },
  {
    value: 'documents',
    icon: 'folder-outline',
    activeIcon: 'folder',
    labelKey: 'tripDetail.segments.documents',
  },
  {
    value: 'checklists',
    icon: 'checkbox-outline',
    activeIcon: 'checkbox',
    labelKey: 'tripDetail.segments.checklists',
  },
  {
    value: 'expenses',
    icon: 'wallet-outline',
    activeIcon: 'wallet',
    labelKey: 'tripDetail.segments.expenses',
  },
];

/**
 * Trip detail — gradient header + scrollable icon+label section switcher
 * for the 5 trip sub-areas (design §D3, fixes MUST-FIX #1: the previous
 * 5-up `ion-segment` truncated every label to "DESTI…"/"ITINE…" and a
 * header FAB overlapped it). `SectionNavComponent` is scrollable so full
 * plain-language labels (Places/Plan/Stays/Files/Lists/Money i18n copy)
 * are always readable, and the add-action for each section now lives in
 * that section's own child route content (its own `slot="fixed"` FAB),
 * never in this header, so it can never overlap the nav.
 *
 * DEFINITIVE structural fix (UI iteration 4, FIX 2): this page owns the
 * ONE `ion-content` for every section (destinations/itinerary/documents/
 * checklists/expenses) and routes them through a PLAIN Angular
 * `router-outlet` (not `ion-router-outlet`). The previous structure had
 * `ion-header` as a sibling of `ion-router-outlet`, and `ion-router-outlet`
 * is absolutely positioned to fill the whole `.ion-page` from `top: 0`
 * regardless of header translucency — so every child page's OWN nested
 * `ion-content` rendered UNDER/OVER the header instead of below it,
 * overlapping the section-nav row. With a single shared `ion-content` and
 * a plain `router-outlet`, each section's markup is a content FRAGMENT
 * (see documents/destinations/itinerary/checklists/expenses page
 * templates — their outer `ion-content` was removed) that renders inside
 * THIS page's `ion-content`, below the header, in normal document flow —
 * there is exactly one scroll container and no overlap is possible.
 */
@Component({
  selector: 'app-trip-detail',
  templateUrl: './trip-detail.page.html',
  styleUrl: './trip-detail.page.scss',
  imports: [
    RouterLink,
    RouterOutlet,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonButton,
    IonIcon,
    IonContent,
    SectionNavComponent,
    TranslatePipe,
    AppDateRangePipe,
  ],
})
export class TripDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly travelService = inject(TravelService);

  protected readonly sectionItems = SECTION_NAV_ITEMS;
  protected readonly tripId = signal('');

  protected readonly trip = computed(() =>
    this.travelService.trips().find((candidate) => candidate.id === this.tripId()),
  );

  constructor() {
    addIcons({
      createOutline,
      locationOutline,
      location,
      timeOutline,
      time,
      bedOutline,
      bed,
      folderOutline,
      folder,
      checkboxOutline,
      checkbox,
      walletOutline,
      wallet,
    });
  }

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.tripId.set(id);
    await this.travelService.load();
  }

  protected activeSegment(): string {
    const url = this.router.url;
    return TRIP_SEGMENTS.find((segment) => url.includes(`/${segment}`)) ?? 'destinations';
  }

  async onSegmentChange(segment: string): Promise<void> {
    await this.router.navigate(['/tabs/trips', this.tripId(), segment]);
  }
}
