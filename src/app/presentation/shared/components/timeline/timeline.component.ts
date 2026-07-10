import { NgTemplateOutlet } from '@angular/common';
import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
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
  chevronForwardOutline,
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
  /**
   * Optional `routerLink` commands array. When present, the row renders as
   * a real, keyboard-focusable link with a trailing chevron affordance and
   * navigates there on tap/Enter. The component stays generic/reusable —
   * it never builds routes itself; callers (Itinerary, Today) pass the
   * already-resolved target (e.g. via `destinationLink()`).
   */
  readonly link?: readonly (string | number)[];
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
  imports: [IonIcon, AppDatePipe, RouterLink, NgTemplateOutlet],
  template: `
    <div class="app-timeline app-stagger">
      @for (item of items(); track item.id) {
        <div class="app-timeline-item">
          <div class="app-timeline-dot" [class]="'app-category--' + item.category">
            <ion-icon [name]="item.icon" aria-hidden="true"></ion-icon>
          </div>
          @if (item.link) {
            <a
              class="app-timeline-content app-timeline-content--tappable"
              [routerLink]="item.link"
              [attr.aria-label]="item.label"
            >
              <div class="app-timeline-content__text">
                <ng-container *ngTemplateOutlet="body; context: { item }"></ng-container>
              </div>
              <ion-icon
                name="chevron-forward-outline"
                class="app-timeline-chevron"
                aria-hidden="true"
              ></ion-icon>
            </a>
          } @else {
            <div class="app-timeline-content">
              <ng-container *ngTemplateOutlet="body; context: { item }"></ng-container>
            </div>
          }
        </div>
      }
    </div>

    <ng-template #body let-item="item">
      <p class="app-timeline-date">{{ item.date | appDate }}</p>
      <p class="app-timeline-label">{{ item.label }}</p>
      @if (item.meta) {
        <p class="app-timeline-meta">{{ item.meta }}</p>
      }
    </ng-template>
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
      chevronForwardOutline,
    });
  }
}
