import { Component } from '@angular/core';
import { IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import { todayOutline, airplaneOutline, settingsOutline } from 'ionicons/icons';

/**
 * Bottom tab shell: Today / Trips / Settings (design §12).
 * Each tab route is lazy-loaded via `tabs.routes.ts`.
 */
@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  styleUrls: ['tabs.page.scss'],
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel, TranslatePipe],
})
export class TabsPage {
  constructor() {
    addIcons({ todayOutline, airplaneOutline, settingsOutline });
  }
}
