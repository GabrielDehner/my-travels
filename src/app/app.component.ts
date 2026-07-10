import { Component, inject } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';

import { StorageQuotaService } from './infrastructure/persistence/storage-quota.service';
import { AppUpdateService } from './presentation/shared/services/app-update.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent {
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
