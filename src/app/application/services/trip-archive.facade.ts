import { Injectable, inject, signal } from '@angular/core';

import { TRIP_ARCHIVE } from '../../core/di/repository.tokens';
import { toErrorMessage } from '../shared/error.util';

/**
 * Thin application facade over the `TRIP_ARCHIVE` port token, exposing
 * loading/error Signals for the Settings export/import UI (design §5, §10,
 * task 5.8). Presentation never injects `TRIP_ARCHIVE` directly.
 */
@Injectable({ providedIn: 'root' })
export class TripArchiveFacade {
  private readonly tripArchive = inject(TRIP_ARCHIVE);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  /** Exports the given trip as a ZIP `Blob`, or `undefined` on failure. */
  async exportTrip(travelId: string): Promise<Blob | undefined> {
    this.loading.set(true);
    this.error.set(null);
    try {
      return await this.tripArchive.export(travelId);
    } catch (err) {
      this.error.set(toErrorMessage(err));
      return undefined;
    } finally {
      this.loading.set(false);
    }
  }

  /** Imports a previously exported archive; returns the new local travelId, or `undefined` on failure. */
  async importTrip(archive: Blob): Promise<string | undefined> {
    this.loading.set(true);
    this.error.set(null);
    try {
      return await this.tripArchive.import(archive);
    } catch (err) {
      this.error.set(toErrorMessage(err));
      return undefined;
    } finally {
      this.loading.set(false);
    }
  }
}
