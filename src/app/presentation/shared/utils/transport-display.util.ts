import type { Transport } from '../../../domain/entities/transport';

/**
 * Builds a short "company/number · terminal" meta line for a Transport
 * event, shown under the timeline label (Itinerary, Today). Returns
 * `undefined` when there is nothing useful to show — keeps the timeline
 * uncluttered for non-technical users.
 */
export function transportMeta(transport: Transport): string | undefined {
  const parts: string[] = [];
  if (transport.company) parts.push(transport.company);
  if (transport.number) parts.push(transport.number);

  const terminalName = transport.terminal?.address ?? transport.terminal?.label;
  if (terminalName) parts.push(terminalName);

  return parts.length > 0 ? parts.join(' · ') : undefined;
}

/**
 * Resolves the display label for a ticket/transport row: the user-provided
 * `title` when present, otherwise the caller's pre-computed fallback (the
 * translated type, or a type+company/number composed label). Centralized so
 * every screen that lists tickets (Destination detail, Itinerary, Today)
 * stays consistent.
 */
export function ticketLabel(transport: Pick<Transport, 'title'>, fallback: string): string {
  const title = transport.title?.trim();
  return title ? title : fallback;
}
