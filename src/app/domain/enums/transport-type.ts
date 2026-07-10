/**
 * Discriminator for a Transport (ticket) entry under a Destination
 * (MVP promotion — design §2, "Ticket modeling").
 */
export type TransportType = 'flight' | 'train' | 'bus' | 'car' | 'ferry' | 'other';
