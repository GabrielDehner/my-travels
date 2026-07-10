import { Component, ElementRef, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonItem,
  IonLabel,
  IonSelect,
  IonSelectOption,
  IonButton,
  IonIcon,
  IonProgressBar,
} from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import { cloudDownloadOutline, cloudUploadOutline } from 'ionicons/icons';

import { TravelService } from '../../../application/services/travel.service';
import { TripArchiveFacade } from '../../../application/services/trip-archive.facade';
import type { AppLanguage } from '../../../core/config/language';
import { LanguageService } from '../../../core/config/language.service';
import { ThemeService } from '../../../core/config/theme.service';
import { StorageQuotaService } from '../../../infrastructure/persistence/storage-quota.service';
import { canShareFile, isShareAbortError } from '../../shared/utils/web-share.util';

/**
 * Settings — theme preference (task 7.3, real light/dark/system switching
 * via `ThemeService`, persisted in localStorage), storage/quota display with
 * a warn state above 80% usage (task 7.5 polish), and the Export/Import
 * trip UI over the `TripArchiveFacade` (design §5, §9, §10, §13). Export
 * prefers the OS share sheet (Web Share API with files — WhatsApp, mail,
 * AirDrop, etc.) when the platform supports sharing the ZIP `File`, and
 * falls back to the existing anchor `download` behavior otherwise (desktop
 * Chrome, or any browser without `navigator.canShare`/`navigator.share`).
 * The user cancelling the native share sheet (`AbortError`) is a normal,
 * silent outcome — no error is shown. Import reconstructs a trip from a
 * picked `.zip` file with regenerated UUIDs. Native file inputs are visually
 * hidden and triggered by styled `ion-button`s (task 7.2 — no raw file-input
 * controls shown to the user).
 */
@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrl: './settings.page.scss',
  imports: [
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonItem,
    IonLabel,
    IonSelect,
    IonSelectOption,
    IonButton,
    IonIcon,
    IonProgressBar,
    TranslatePipe,
  ],
})
export class SettingsPage implements OnInit {
  protected readonly travelService = inject(TravelService);
  protected readonly tripArchiveFacade = inject(TripArchiveFacade);
  protected readonly themeService = inject(ThemeService);
  protected readonly languageService = inject(LanguageService);
  private readonly storageQuotaService = inject(StorageQuotaService);
  private readonly translate = inject(TranslateService);

  @ViewChild('importInput') private importInput?: ElementRef<HTMLInputElement>;

  protected readonly quota = signal<{ usage: number; quota: number } | undefined>(undefined);
  protected readonly usageRatio = computed(() => {
    const q = this.quota();
    if (!q || q.quota === 0) return 0;
    return q.usage / q.quota;
  });
  protected readonly usageWarn = computed(() => this.usageRatio() > 0.8);

  protected readonly selectedTripId = signal('');
  protected readonly exportStatus = signal<string | null>(null);
  protected readonly importStatus = signal<string | null>(null);

  constructor() {
    addIcons({ cloudDownloadOutline, cloudUploadOutline });
  }

  async ngOnInit(): Promise<void> {
    await this.travelService.load();
    await this.storageQuotaService.requestPersistence();
    this.quota.set(await this.storageQuotaService.estimate());
  }

  onThemeChange(value: string): void {
    if (value === 'light' || value === 'dark' || value === 'system') {
      this.themeService.setPreference(value);
    }
  }

  onLanguageChange(value: string): void {
    if (value === 'es' || value === 'en') {
      this.languageService.setLanguage(value as AppLanguage);
    }
  }

  protected formatBytes(bytes: number): string {
    const mb = bytes / (1024 * 1024);
    if (mb >= 1024) return `${(mb / 1024).toFixed(1)}GB`;
    return `${mb.toFixed(0)}MB`;
  }

  triggerImport(): void {
    this.importInput?.nativeElement.click();
  }

  async exportSelectedTrip(): Promise<void> {
    this.exportStatus.set(null);
    const tripId = this.selectedTripId();
    if (!tripId) {
      this.exportStatus.set(this.translate.instant('settings.chooseTripToExport'));
      return;
    }

    const blob = await this.tripArchiveFacade.exportTrip(tripId);
    if (!blob) {
      this.exportStatus.set(
        this.tripArchiveFacade.error() ?? this.translate.instant('settings.exportFailed'),
      );
      return;
    }

    const trip = this.travelService.trips().find((t) => t.id === tripId);
    const title = trip?.title ?? tripId;
    const fileName = `trip-${trip ? this.slugify(trip.title) : tripId}.zip`;
    const file = new File([blob], fileName, { type: 'application/zip' });

    if (canShareFile(navigator, file)) {
      try {
        await navigator.share({
          files: [file],
          title: this.translate.instant('settings.shareTitle'),
          text: this.translate.instant('settings.shareText', { title }),
        });
        this.exportStatus.set(this.translate.instant('settings.sharedSuccess', { title }));
        return;
      } catch (err) {
        // The user cancelling the native share sheet is a normal outcome —
        // stay silent rather than showing an error. Any other failure falls
        // through to the anchor-download fallback below.
        if (isShareAbortError(err)) return;
      }
    }

    this.downloadFile(file, fileName);
    this.exportStatus.set(this.translate.instant('settings.exportedSuccess', { title }));
  }

  private downloadFile(file: File, fileName: string): void {
    const url = URL.createObjectURL(file);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    // Revoke on a short delay rather than immediately after click() — some
    // browsers (notably Safari) haven't finished reading the Blob URL yet
    // at the moment click() returns, so an immediate revoke can corrupt
    // the download (design §9 still requires eventual revocation).
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async onImportFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    this.importStatus.set(null);
    const newTripId = await this.tripArchiveFacade.importTrip(file);
    if (!newTripId) {
      this.importStatus.set(
        this.tripArchiveFacade.error() ?? this.translate.instant('settings.importFailed'),
      );
      return;
    }

    await this.travelService.load();
    this.importStatus.set(this.translate.instant('settings.importedSuccess'));
  }

  private slugify(title: string): string {
    return (
      title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') || 'trip'
    );
  }
}
