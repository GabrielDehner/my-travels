import { Component, inject } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';

import { StorageQuotaService } from './infrastructure/persistence/storage-quota.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent {
  private readonly storageQuotaService = inject(StorageQuotaService);

  constructor() {
    // Request persistent storage as early as possible so trip documents are
    // not silently evicted under storage pressure (design §9).
    void this.storageQuotaService.requestPersistence();
  }
}
