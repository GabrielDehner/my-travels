import { Injectable, inject } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { ToastController } from '@ionic/angular/standalone';
import { TranslateService } from '@ngx-translate/core';

/**
 * "New version available -> Update" prompt for installed/PWA users
 * (`provideServiceWorker` in `app.config.ts`). Subscribes to
 * `SwUpdate.versionUpdates` and, on a `VERSION_READY` event, shows a
 * non-blocking `ion-toast` with an "Update"/"Actualizar" button; tapping it
 * activates the new version and reloads. Also prompts a reload on the rare
 * `unrecoverable` state, where the running app is in a broken state and a
 * full reload is the only fix.
 *
 * `SwUpdate.isEnabled` is `false` whenever the service worker itself is
 * disabled (dev mode, `ng test`, or any browser without SW support) — every
 * public method is a no-op in that case, so this service safely does
 * nothing outside of a production build with the SW registered.
 */
@Injectable({ providedIn: 'root' })
export class AppUpdateService {
  private readonly swUpdate = inject(SwUpdate);
  private readonly toastCtrl = inject(ToastController);
  private readonly translate = inject(TranslateService);

  /** Subscribes to SW update events. No-op when the service worker is disabled. */
  init(): void {
    if (!this.swUpdate.isEnabled) return;

    this.swUpdate.versionUpdates.subscribe((event) => {
      if (event.type === 'VERSION_READY') {
        void this.promptUpdate(event);
      }
    });

    this.swUpdate.unrecoverable.subscribe(() => {
      void this.promptReload();
    });
  }

  private async promptUpdate(_event: VersionReadyEvent): Promise<void> {
    const toast = await this.toastCtrl.create({
      message: this.translate.instant('common.updateAvailable'),
      position: 'bottom',
      buttons: [
        {
          text: this.translate.instant('common.update'),
          handler: () => void this.activateUpdate(),
        },
      ],
    });
    await toast.present();
  }

  private async promptReload(): Promise<void> {
    const toast = await this.toastCtrl.create({
      message: this.translate.instant('common.updateAvailable'),
      position: 'bottom',
      buttons: [
        {
          text: this.translate.instant('common.update'),
          handler: () => document.location.reload(),
        },
      ],
    });
    await toast.present();
  }

  private async activateUpdate(): Promise<void> {
    await this.swUpdate.activateUpdate();
    document.location.reload();
  }
}
