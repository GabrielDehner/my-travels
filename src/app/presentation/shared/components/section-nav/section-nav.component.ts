import { Component, input, output } from '@angular/core';
import { IonSegment, IonSegmentButton, IonIcon, IonLabel } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';

/** One entry rendered by `SectionNavComponent` (design §C5). */
export interface SectionNavItem {
  readonly value: string;
  /** Outline glyph shown when inactive. */
  readonly icon: string;
  /** Filled glyph shown when active. */
  readonly activeIcon: string;
  /** i18n key resolved to the short plain-language label (e.g. "Places"). */
  readonly labelKey: string;
}

/**
 * Scrollable icon+label section switcher (design §C5) — replaces the
 * truncated 5-up `ion-segment` on trip detail. Presentation-only, no
 * application/domain imports (dependency-cruiser presentation/shared rule).
 * The add-action for each section lives in the child route content, never
 * here, so it can never overlap this control (design §C6).
 */
@Component({
  selector: 'app-section-nav',
  standalone: true,
  imports: [IonSegment, IonSegmentButton, IonIcon, IonLabel, TranslatePipe],
  template: `
    <ion-segment
      class="app-section-nav"
      mode="ios"
      scrollable="true"
      [value]="active()"
      (ionChange)="onChange($event)"
    >
      @for (item of items(); track item.value) {
        <ion-segment-button [value]="item.value">
          <ion-icon [name]="active() === item.value ? item.activeIcon : item.icon"></ion-icon>
          <ion-label>{{ item.labelKey | translate }}</ion-label>
        </ion-segment-button>
      }
    </ion-segment>
  `,
})
export class SectionNavComponent {
  readonly items = input.required<readonly SectionNavItem[]>();
  readonly active = input.required<string>();

  readonly sectionChange = output<string>();

  onChange(event: CustomEvent<{ value?: string | number }>): void {
    const value = event.detail.value;
    if (typeof value !== 'string') return;
    this.sectionChange.emit(value);
  }
}
