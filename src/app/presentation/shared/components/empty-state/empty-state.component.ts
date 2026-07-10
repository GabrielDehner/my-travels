import { Component, input, output } from '@angular/core';
import { IonIcon, IonButton } from '@ionic/angular/standalone';

/**
 * Friendly guided empty state (design §C10) — soft-colored icon circle,
 * one-sentence explanation, single clear primary CTA. Used across every
 * feature page (Trips, Documents, Checklists, Expenses, Destinations,
 * Lodging, Itinerary, Today) so a non-technical traveler always knows what
 * to do next instead of facing a bare "no data" message.
 */
@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [IonIcon, IonButton],
  template: `
    <div class="app-empty-state">
      <div class="app-empty-state__icon">
        <ion-icon [name]="icon()" aria-hidden="true"></ion-icon>
      </div>
      <p class="app-empty-state__title">{{ title() }}</p>
      <p class="app-empty-state__message">{{ message() }}</p>
      @if (ctaLabel()) {
        <ion-button class="app-empty-state__cta app-btn-primary" (click)="cta.emit()">
          {{ ctaLabel() }}
        </ion-button>
      }
    </div>
  `,
})
export class EmptyStateComponent {
  readonly icon = input.required<string>();
  readonly title = input.required<string>();
  readonly message = input.required<string>();
  readonly ctaLabel = input<string | undefined>(undefined);

  readonly cta = output<void>();
}
