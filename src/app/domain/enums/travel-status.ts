/**
 * Lifecycle status of a Travel (Trip), used for grouping in the Trips list
 * (design §13 wireframes: UPCOMING / PAST).
 */
export type TravelStatus = 'planning' | 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
