import type { TransportType } from '../../../domain/enums/transport-type';

/**
 * Ionicons name per `TransportType`, shared across every screen that
 * renders a Transport/ticket (Destination detail, Itinerary, Today) so the
 * icon-to-type mapping never drifts between screens.
 */
export const TRANSPORT_ICONS: Record<TransportType, string> = {
  flight: 'airplane-outline',
  train: 'train-outline',
  bus: 'bus-outline',
  car: 'car-outline',
  ferry: 'boat-outline',
  other: 'help-circle-outline',
};
