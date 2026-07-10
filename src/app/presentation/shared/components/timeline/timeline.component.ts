import { Component, input } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  locationOutline,
  bedOutline,
  documentOutline,
  cashOutline,
  checkboxOutline,
  alarmOutline,
  airplaneOutline,
  trainOutline,
  busOutline,
  carOutline,
  boatOutline,
  helpCircleOutline,
} from 'ionicons/icons';

import { AppDatePipe } from '../../pipes/app-date.pipe';

/** Visual category driving the timeline dot color + icon (design §13). */
export type TimelineCategory =
  | 'destination'
  | 'lodging'
  | 'document'
  | 'expense'
  | 'checklist'
  | 'reminder'
  | 'transport';

/** One entry rendered by `TimelineComponent`. */
export interface TimelineItem {
  readonly id: string;
  readonly category: TimelineCategory;
  readonly icon: string;
  readonly date: string;
  readonly label: string;
  readonly meta?: string;
}

/**
 * Reusable, information-dense timeline: a connecting vertical line with
 * colored category dots/icons per entry (design §13 wireframes — Today,
 * Destinations, Itinerary all show this pattern). Presentation-only, no
 * application/domain imports (dependency-cruiser presentation/shared rule).
 */
@Component({
  selector: 'app-timeline',
  standalone: true,
  imports: [IonIcon, AppDatePipe],
  template: `
    <div class="app-timeline app-stagger">
      @for (item of items(); track item.id) {
        <div class="app-timeline-item">
          <div class="app-timeline-dot" [class]="'app-category--' + item.category">
            <ion-icon [name]="item.icon" aria-hidden="true"></ion-icon>
          </div>
          <div class="app-timeline-content">
            <p class="app-timeline-date">{{ item.date | appDate }}</p>
            <p class="app-timeline-label">{{ item.label }}</p>
            @if (item.meta) {
              <p class="app-timeline-meta">{{ item.meta }}</p>
            }
          </div>
        </div>
      }
    </div>
  `,
})
export class TimelineComponent {
  readonly items = input.required<readonly TimelineItem[]>();

  constructor() {
    addIcons({
      locationOutline,
      bedOutline,
      documentOutline,
      cashOutline,
      checkboxOutline,
      alarmOutline,
      airplaneOutline,
      trainOutline,
      busOutline,
      carOutline,
      boatOutline,
      helpCircleOutline,
    });
  }
}
