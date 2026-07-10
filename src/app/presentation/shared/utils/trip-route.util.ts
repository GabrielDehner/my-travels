import type { ActivatedRoute } from '@angular/router';
import { combineLatest, distinctUntilChanged, map, type Observable } from 'rxjs';

/**
 * Robust nearest-ancestor route-param resolution for trip sub-pages.
 *
 * DEFINITIVE root cause (UI iteration 4, confirmed via runtime debugging):
 * a trip section child page's `ActivatedRoute` had NO parent chain at all
 * (`.parent` resolved `null`) at the time it was read, AND — separately and
 * more fundamentally — the child's OWN `route.snapshot.paramMap`/
 * `route.paramMap` never contained `id` in the first place. Angular's
 * default `paramsInheritanceStrategy: 'emptyOnly'` (the router config in
 * `app.config.ts` before this fix) only merges an ancestor's params into a
 * child's own paramMap when the child's route `path` is EMPTY (`''`).
 * Every trip section (`destinations`, `itinerary`, `documents`,
 * `checklists`, `expenses`) has a non-empty path, so `:id` from the parent
 * `trips/:id` route was never inherited — no amount of ancestor-walking
 * could find it if the parent reference itself was transiently null.
 *
 * The fix is `withRouterConfig({ paramsInheritanceStrategy: 'always' })` in
 * `app.config.ts`: it makes every descendant route inherit ALL ancestor
 * params unconditionally, so each section page's OWN `route.snapshot.
 * paramMap`/`route.paramMap` reliably contains `id` regardless of the
 * ancestor-chain/outlet-activation timing that broke the old ancestor-walk
 * approach. Full-page routes with multi-segment paths (destination-form,
 * lodging-form, lodging-list — now flat sibling routes such as
 * `trips/:id/destinations/:destinationId/edit`) already carry `id` directly
 * on their own paramMap since a single route config matching multiple URL
 * segments owns all of those segments' params itself.
 *
 * `resolveTripId`/`tripId$` below still walk the full ancestor chain (not
 * just `.parent`) as defense-in-depth — this is now normally a no-op first
 * hit against the route's own (inherited) paramMap, but keeps working even
 * if a future route is nested without inheriting this app-wide config.
 */
function ancestorChain(route: ActivatedRoute): ActivatedRoute[] {
  const chain: ActivatedRoute[] = [];
  let current: ActivatedRoute | null = route;
  while (current) {
    chain.push(current);
    current = current.parent;
  }
  return chain;
}

/** Snapshot-based nearest-ancestor `id` param lookup (current route -> root). */
export function resolveTripId(route: ActivatedRoute): string {
  for (const ancestor of ancestorChain(route)) {
    const id = ancestor.snapshot.paramMap.get('id');
    if (id) return id;
  }
  return '';
}

/**
 * Observable variant: emits the nearest-ancestor `id` param and re-emits
 * whenever any ancestor's params change, so it stays correct across Ionic
 * page reuse/navigation instead of only reading a single snapshot.
 */
export function tripId$(route: ActivatedRoute): Observable<string> {
  const chain = ancestorChain(route);
  return combineLatest(chain.map((ancestor) => ancestor.paramMap)).pipe(
    map((paramMaps) => {
      for (const params of paramMaps) {
        const id = params.get('id');
        if (id) return id;
      }
      return '';
    }),
    distinctUntilChanged(),
  );
}
