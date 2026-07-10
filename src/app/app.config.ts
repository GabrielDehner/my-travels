import { provideHttpClient } from '@angular/common/http';
import { ErrorHandler, type ApplicationConfig, isDevMode } from '@angular/core';
import {
  PreloadAllModules,
  RouteReuseStrategy,
  provideRouter,
  withPreloading,
  withRouterConfig,
} from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';
import { provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';

import { routes } from './app.routes';
import { resolveInitialLanguage } from './core/config/language';
import { provideDataLayer } from './core/di/providers';
import { AppErrorHandler } from './core/error-handler';

/**
 * Standalone bootstrap configuration (design §4, §15). `provideDataLayer()`
 * is the ONLY place the data layer is wired into the app — swapping to a
 * future backend means changing that one function, not this file.
 *
 * i18n (task 8.1): `@ngx-translate/core` + `@ngx-translate/http-loader` was
 * chosen over Angular's built-in `$localize` because `$localize` bakes
 * translations at BUILD time — switching language would require a full
 * rebuild/redeploy per locale. ngx-translate loads JSON resources over HTTP
 * at RUNTIME, so a user can switch ES<->EN instantly without a page reload
 * or a new build, and translations live as plain JSON assets
 * (`src/assets/i18n/{lang}.json`) rather than compiled into the bundle.
 * Initial language is resolved synchronously (`resolveInitialLanguage`,
 * task 8.2) — persisted choice first, else device language, else Spanish
 * (the app's primary user base) — with English as the `fallbackLang` for
 * any missing key in any language.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    { provide: ErrorHandler, useClass: AppErrorHandler },
    provideIonicAngular(),
    provideRouter(
      routes,
      withPreloading(PreloadAllModules),
      // `paramsInheritanceStrategy: 'always'` (root cause fix, UI iteration 4):
      // Angular's default 'emptyOnly' strategy only inherits ancestor route
      // params into a child's OWN paramMap when the child's path is empty
      // (''). Every trip section route (documents/destinations/itinerary/
      // checklists/expenses) has a non-empty path segment, so `:id` from the
      // parent `trips/:id` route was NEVER present on the child's own
      // `route.snapshot.paramMap`/`route.paramMap` — only reachable (when at
      // all) via a manual ancestor walk, which itself could observe a null
      // `.parent` depending on outlet activation timing. 'always' makes every
      // descendant route inherit ALL ancestor params unconditionally, so each
      // section page's own paramMap reliably contains `id` regardless of
      // outlet/activation timing.
      withRouterConfig({ paramsInheritanceStrategy: 'always' }),
    ),
    provideHttpClient(),
    provideTranslateService({
      lang: resolveInitialLanguage(),
      fallbackLang: 'en',
      loader: provideTranslateHttpLoader({ prefix: '/assets/i18n/', suffix: '.json' }),
    }),
    ...provideDataLayer(),
    // PWA installability + app-shell caching (offline data itself is already
    // handled by IndexedDB — this only caches the shell/assets). Disabled in
    // dev/tests via `isDevMode()` so it never interferes with `ng serve` or
    // `ng test`; registers after the app is stable for 30s to avoid delaying
    // first paint.
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
