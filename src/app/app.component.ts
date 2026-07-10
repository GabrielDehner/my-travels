import { Component, inject } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';

import { ThemeService } from './core/config/theme.service';
import { StorageQuotaService } from './infrastructure/persistence/storage-quota.service';
import { AppUpdateService } from './presentation/shared/services/app-update.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent {
  // Injected (not just imported) so the persisted theme preference is
  // (re-)applied at app bootstrap regardless of which route the app first
  // lands on. `ThemeService` is `providedIn: 'root'` but is otherwise only
  // injected by the Settings page — without this eager construction here, a
  // fresh load/reload that opens on Today (or any other non-Settings route)
  // never constructs the service, so the persisted theme is never re-applied
  // and the app silently reverts to light/system (bug fix).
  private readonly themeService = inject(ThemeService);
  private readonly storageQuotaService = inject(StorageQuotaService);
  private readonly appUpdateService = inject(AppUpdateService);

  constructor() {
    // Request persistent storage as early as possible so trip documents are
    // not silently evicted under storage pressure (design §9).
    void this.storageQuotaService.requestPersistence();
    // "New version available -> Update" prompt (PWA / SwUpdate). A no-op
    // whenever the service worker is disabled (dev, tests, unsupported
    // browsers) — see `AppUpdateService.init()`.
    this.appUpdateService.init();
  }
}
