/**
 * Builds the Angular Router `routerLink` commands array pointing at a
 * destination's place-detail page (`/tabs/trips/:tripId/destinations/:destinationId`).
 * Used to make Itinerary/Today timeline items (destination arrival/departure,
 * lodging check-in/out, transport depart/arrive) tappable — all of them
 * ultimately belong to a destination, so they all resolve to the same
 * target shape. Pure — no Angular/Router import, keeps the timeline
 * component and the feature pages free of duplicated route-array literals.
 */
export function destinationLink(
  tripId: string,
  destinationId: string,
): readonly (string | number)[] {
  return ['/tabs/trips', tripId, 'destinations', destinationId];
}
