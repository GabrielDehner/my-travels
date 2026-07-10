import { Component, computed, inject, input, output, signal } from '@angular/core';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonSearchbar,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import { chevronDown } from 'ionicons/icons';

import { COUNTRIES, findCountry } from '../../data/countries.data';
import { filterCountries } from '../../utils/country-filter.util';
import { countryFlagEmoji } from '../../utils/country-flag.util';

/**
 * Searchable country picker (design fix — replaces the plain `ion-select`
 * that forced users to scroll through ~200 countries with no way to type a
 * search). Tapping the closed field opens a full-screen `ion-modal` with an
 * `ion-searchbar` at top and a scrollable list below; typing filters the
 * list live via the pure {@link filterCountries} helper (case-insensitive
 * substring match on the localized name). Selecting a row (or the "no
 * country" option) closes the modal and emits the ISO alpha-2 code.
 *
 * Presentation-only, reuses the existing `countries.data`/`country-flag`
 * utils — no domain/application imports (dependency-cruiser boundary).
 */
@Component({
  selector: 'app-country-picker',
  standalone: true,
  imports: [
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonModal,
    IonSearchbar,
    IonTitle,
    IonToolbar,
    TranslatePipe,
  ],
  template: `
    <button
      type="button"
      class="country-picker"
      (click)="isOpen.set(true)"
      [attr.aria-label]="'destinationForm.country' | translate"
    >
      <span
        class="country-picker__value"
        [class.country-picker__value--placeholder]="!selectedLabel()"
      >
        {{ selectedLabel() || placeholder() }}
      </span>
      <ion-icon name="chevron-down" class="country-picker__chevron" aria-hidden="true"></ion-icon>
    </button>

    <ion-modal [isOpen]="isOpen()" (didDismiss)="close()">
      <ng-template>
        <ion-header>
          <ion-toolbar>
            <ion-title>{{ 'countryPicker.title' | translate }}</ion-title>
            <ion-buttons slot="end">
              <ion-button (click)="close()">{{ 'common.close' | translate }}</ion-button>
            </ion-buttons>
          </ion-toolbar>
          <ion-toolbar>
            <ion-searchbar
              [placeholder]="'countryPicker.searchPlaceholder' | translate"
              [debounce]="0"
              [value]="query()"
              (ionInput)="query.set($event.detail.value ?? '')"
            ></ion-searchbar>
          </ion-toolbar>
        </ion-header>
        <ion-content>
          <ion-list>
            <ion-item button [detail]="false" (click)="select('')">
              <ion-label>{{ 'countryPicker.none' | translate }}</ion-label>
            </ion-item>
            @for (option of filteredOptions(); track option.code) {
              <ion-item button [detail]="false" (click)="select(option.code)">
                <ion-label>{{ option.flag }} {{ option.name }}</ion-label>
              </ion-item>
            } @empty {
              @if (query().trim()) {
                <ion-item lines="none">
                  <ion-label class="country-picker__no-results">
                    {{ 'countryPicker.noResults' | translate }}
                  </ion-label>
                </ion-item>
              }
            }
          </ion-list>
        </ion-content>
      </ng-template>
    </ion-modal>
  `,
  styleUrl: './country-picker.component.scss',
})
export class CountryPickerComponent {
  private readonly translate = inject(TranslateService);

  /** Selected ISO alpha-2 code, or '' for "no country". */
  readonly value = input<string>('');
  readonly valueChange = output<string>();

  protected readonly isOpen = signal(false);
  protected readonly query = signal('');

  constructor() {
    addIcons({ chevronDown });
  }

  /** Flag + localized name for the currently selected country, or '' when unset. */
  protected readonly selectedLabel = computed(() => {
    const country = findCountry(this.value());
    if (!country) return '';
    const lang = this.translate.currentLang();
    const name = lang === 'es' ? country.es : country.en;
    return `${countryFlagEmoji(country.code)} ${name}`;
  });

  protected readonly placeholder = computed(() =>
    this.translate.instant('destinationForm.countryPlaceholder'),
  );

  /** Full option list (flag + localized name) filtered live by the search query. */
  protected readonly filteredOptions = computed(() => {
    const lang = this.translate.currentLang();
    const matches = filterCountries(COUNTRIES, this.query(), lang);
    return matches
      .map((country) => ({
        code: country.code,
        name: lang === 'es' ? country.es : country.en,
        flag: countryFlagEmoji(country.code),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  });

  protected select(code: string): void {
    this.valueChange.emit(code);
    this.close();
  }

  protected close(): void {
    this.isOpen.set(false);
    this.query.set('');
  }
}
