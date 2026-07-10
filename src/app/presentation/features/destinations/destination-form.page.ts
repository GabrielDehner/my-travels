import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
  IonButton,
  IonContent,
  IonItem,
  IonLabel,
  IonInput,
  IonTextarea,
} from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { DestinationService } from '../../../application/services/destination.service';
import type { Destination } from '../../../domain/entities/destination';
import { CountryPickerComponent } from '../../shared/components/country-picker/country-picker.component';
import { findCountry } from '../../shared/data/countries.data';
import { resolveTripId } from '../../shared/utils/trip-route.util';

/**
 * Destination create/edit form — reused for both
 * `/trips/:id/destinations/new` (no destination id) and
 * `/trips/:id/destinations/:destinationId/edit` (destination id present),
 * per design §13's Destinations timeline.
 */
@Component({
  selector: 'app-destination-form',
  templateUrl: './destination-form.page.html',
  styleUrl: './destination-form.page.scss',
  imports: [
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonButton,
    IonContent,
    IonItem,
    IonLabel,
    IonInput,
    IonTextarea,
    CountryPickerComponent,
    TranslatePipe,
  ],
})
export class DestinationFormPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destinationService = inject(DestinationService);
  private readonly translate = inject(TranslateService);

  protected readonly tripId = signal('');

  protected readonly name = signal('');
  /** Selected ISO alpha-2 country code, or '' for "no country". */
  protected readonly countryCode = signal('');
  protected readonly city = signal('');
  protected readonly arrival = signal(new Date().toISOString().slice(0, 10));
  protected readonly departure = signal(new Date().toISOString().slice(0, 10));
  protected readonly geoLat = signal('');
  protected readonly geoLng = signal('');
  protected readonly geoLabel = signal('');
  protected readonly notes = signal('');

  protected readonly isEditMode = signal(false);
  protected readonly saving = signal(false);
  protected readonly formError = signal<string | null>(null);

  private editingDestination: Destination | null = null;

  async ngOnInit(): Promise<void> {
    // Robust nearest-ancestor resolution (fix — see trip-route.util.ts).
    const tripId = resolveTripId(this.route);
    this.tripId.set(tripId);

    const destinationId = this.route.snapshot.paramMap.get('destinationId');
    if (!destinationId) return;

    this.isEditMode.set(true);
    await this.destinationService.load(tripId);
    const destination = this.destinationService
      .destinations()
      .find((candidate) => candidate.id === destinationId);
    if (!destination) {
      this.formError.set(this.translate.instant('destinationForm.destinationNotFound'));
      return;
    }

    this.editingDestination = destination;
    this.name.set(destination.name);
    this.countryCode.set(destination.countryCode ?? '');
    this.city.set(destination.city ?? '');
    this.arrival.set(destination.arrival.slice(0, 10));
    this.departure.set(destination.departure.slice(0, 10));
    this.geoLat.set(destination.geo ? String(destination.geo.lat) : '');
    this.geoLng.set(destination.geo ? String(destination.geo.lng) : '');
    this.geoLabel.set(destination.geo?.label ?? '');
    this.notes.set(destination.notes ?? '');
  }

  async save(): Promise<void> {
    this.formError.set(null);

    if (!this.name().trim()) {
      this.formError.set(this.translate.instant('destinationForm.nameRequired'));
      return;
    }

    this.saving.set(true);
    try {
      const countryCode = this.countryCode();
      // Keep the free-text `country` field in sync with the picker (stored
      // in English so it stays stable regardless of the UI language) — it's
      // only a display fallback for data that predates the country picker.
      // Leaving the picker unselected omits both keys entirely, so editing
      // never overwrites/loses an existing country on a legacy destination.
      const countryName = countryCode ? (findCountry(countryCode)?.en ?? '') : '';
      const city = this.city().trim();
      const notes = this.notes().trim();
      const lat = Number.parseFloat(this.geoLat());
      const lng = Number.parseFloat(this.geoLng());
      const label = this.geoLabel().trim();
      const hasGeo = Number.isFinite(lat) && Number.isFinite(lng);

      const input = {
        travelId: this.tripId(),
        name: this.name().trim(),
        arrival: this.arrival(),
        departure: this.departure(),
        ...(countryCode ? { countryCode, country: countryName } : {}),
        ...(city ? { city } : {}),
        ...(hasGeo ? { geo: { lat, lng, ...(label ? { label } : {}) } } : {}),
        ...(notes ? { notes } : {}),
      };

      if (this.isEditMode() && this.editingDestination) {
        await this.destinationService.update(this.editingDestination, input);
      } else {
        await this.destinationService.create(input);
      }

      if (this.destinationService.error()) {
        this.formError.set(this.destinationService.error());
        return;
      }

      await this.router.navigate(['/tabs/trips', this.tripId(), 'destinations']);
    } finally {
      this.saving.set(false);
    }
  }

  async cancel(): Promise<void> {
    await this.router.navigate(['/tabs/trips', this.tripId(), 'destinations']);
  }
}
