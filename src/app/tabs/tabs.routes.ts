import { Routes } from '@angular/router';

import { TabsPage } from './tabs.page';

/**
 * Tab shell + lazy feature routes (design §12). Each feature area is one
 * `loadComponent` chunk. The Trips vertical slice (list/form/detail) is the
 * only fully-implemented feature in this slice; the remaining tab and
 * trip sub-area pages are placeholders to be filled in a later slice.
 */
export const routes: Routes = [
  {
    path: 'tabs',
    component: TabsPage,
    children: [
      {
        path: 'today',
        loadComponent: () =>
          import('../presentation/features/today/today.page').then((m) => m.TodayPage),
      },
      {
        path: 'trips',
        loadComponent: () =>
          import('../presentation/features/trips/trips-list.page').then((m) => m.TripsListPage),
      },
      {
        path: 'trips/new',
        loadComponent: () =>
          import('../presentation/features/trips/trip-form.page').then((m) => m.TripFormPage),
      },
      {
        path: 'trips/:id/edit',
        loadComponent: () =>
          import('../presentation/features/trips/trip-form.page').then((m) => m.TripFormPage),
      },
      // Full-page routes for the create/edit forms (and the lodging list,
      // which is also a full page with its own header/no section-nav) MUST
      // be declared as flat SIBLING routes here — NOT as children of
      // `trips/:id` — and listed BEFORE `trips/:id` below (design fix,
      // UI iteration 4, FIX 2). Angular's Router tries route configs in
      // array order and a literal multi-segment path like
      // `trips/:id/destinations/new` only matches when the URL has exactly
      // that many segments, so it's tried and matched here first; anything
      // with more/fewer segments falls through to `trips/:id` and its own
      // (shorter) children below. This keeps these full pages OUTSIDE
      // `TripDetailPage`'s single shared `ion-content`/section-nav shell, so
      // they render as clean full-screen pages with their own header and no
      // section-nav overlap risk. `withRouterConfig({ paramsInheritanceStrategy:
      // 'always' })` in `app.config.ts` ensures `:id`/`:destinationId` are
      // present directly on each of these routes' own paramMap regardless.
      {
        path: 'trips/:id/destinations/new',
        loadComponent: () =>
          import('../presentation/features/destinations/destination-form.page').then(
            (m) => m.DestinationFormPage,
          ),
      },
      {
        path: 'trips/:id/destinations/:destinationId/edit',
        loadComponent: () =>
          import('../presentation/features/destinations/destination-form.page').then(
            (m) => m.DestinationFormPage,
          ),
      },
      {
        path: 'trips/:id/destinations/:destinationId/lodging',
        loadComponent: () =>
          import('../presentation/features/lodging/lodging-list.page').then(
            (m) => m.LodgingListPage,
          ),
      },
      {
        path: 'trips/:id/destinations/:destinationId/lodging/new',
        loadComponent: () =>
          import('../presentation/features/lodging/lodging-form.page').then(
            (m) => m.LodgingFormPage,
          ),
      },
      {
        path: 'trips/:id/destinations/:destinationId/lodging/:hotelId/edit',
        loadComponent: () =>
          import('../presentation/features/lodging/lodging-form.page').then(
            (m) => m.LodgingFormPage,
          ),
      },
      {
        path: 'trips/:id/destinations/:destinationId/tickets/new',
        loadComponent: () =>
          import('../presentation/features/tickets/ticket-form.page').then(
            (m) => m.TicketFormPage,
          ),
      },
      {
        path: 'trips/:id/destinations/:destinationId/tickets/:transportId/edit',
        loadComponent: () =>
          import('../presentation/features/tickets/ticket-form.page').then(
            (m) => m.TicketFormPage,
          ),
      },
      // Destination (place) DETAIL — lists Lodging + Tickets for one place
      // (destination-logistics design). Declared AFTER the more specific
      // `.../new`, `.../edit`, `.../lodging*`, `.../tickets*` sibling routes
      // above so those literal segments are tried first; this bare
      // `:destinationId` route only matches when nothing more specific did.
      {
        path: 'trips/:id/destinations/:destinationId',
        loadComponent: () =>
          import('../presentation/features/destinations/destination-detail.page').then(
            (m) => m.DestinationDetailPage,
          ),
      },
      {
        path: 'trips/:id',
        loadComponent: () =>
          import('../presentation/features/trips/trip-detail.page').then((m) => m.TripDetailPage),
        children: [
          { path: '', redirectTo: 'destinations', pathMatch: 'full' },
          {
            path: 'destinations',
            loadComponent: () =>
              import('../presentation/features/destinations/destinations.page').then(
                (m) => m.DestinationsPage,
              ),
          },
          {
            path: 'itinerary',
            loadComponent: () =>
              import('../presentation/features/itinerary/itinerary.page').then(
                (m) => m.ItineraryPage,
              ),
          },
          {
            path: 'documents',
            loadComponent: () =>
              import('../presentation/features/documents/documents.page').then(
                (m) => m.DocumentsPage,
              ),
          },
          {
            path: 'checklists',
            loadComponent: () =>
              import('../presentation/features/checklists/checklists.page').then(
                (m) => m.ChecklistsPage,
              ),
          },
          {
            path: 'expenses',
            loadComponent: () =>
              import('../presentation/features/expenses/expenses.page').then((m) => m.ExpensesPage),
          },
        ],
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('../presentation/features/settings/settings.page').then((m) => m.SettingsPage),
      },
      {
        path: '',
        redirectTo: '/tabs/today',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: '',
    redirectTo: '/tabs/today',
    pathMatch: 'full',
  },
];
