import { Injectable, inject, signal } from '@angular/core';

import { TRANSPORT_REPOSITORY } from '../../core/di/repository.tokens';
import type { Transport } from '../../domain/entities/transport';
import type { TransportType } from '../../domain/enums/transport-type';
import type { GeoLocation } from '../../domain/value-objects/geo-location';
import type { Money } from '../../domain/value-objects/money';
import { createBaseEntityFields, touchTimestamps } from '../shared/base-entity.factory';
import { toErrorMessage } from '../shared/error.util';

/** Fields required to create a new Transport (Ticket) entry; `BaseEntity` fields are generated. */
export interface NewTransportInput {
  destinationId: string;
  type: TransportType;
  title?: string;
  bookingUrl?: string;
  terminal?: GeoLocation;
  company?: string;
  number?: string;
  departAt?: string;
  arriveAt?: string;
  seat?: string;
  price?: Money;
  notes?: string;
  mapsUrl?: string;
}

/**
 * Use-case service for Transport/Tickets (destination-logistics design §5).
 * Ordered by `departAt` so the Destination detail page can render tickets
 * chronologically.
 */
@Injectable({ providedIn: 'root' })
export class TransportService {
  private readonly repo = inject(TRANSPORT_REPOSITORY);

  readonly transports = signal<Transport[]>([]);
  readonly error = signal<string | null>(null);

  async load(destinationId: string): Promise<void> {
    try {
      this.transports.set(await this.listFor(destinationId));
    } catch (err) {
      this.error.set(toErrorMessage(err));
    }
  }

  /**
   * Reads Transports for a single Destination WITHOUT touching the shared
   * `transports` signal — used by read-only aggregations that need tickets
   * for multiple destinations at once without clobbering each other's state.
   */
  async listFor(destinationId: string): Promise<Transport[]> {
    try {
      const list = await this.repo.getByDestination(destinationId);
      return [...list].sort((a, b) => {
        if (!a.departAt && !b.departAt) return 0;
        if (!a.departAt) return 1;
        if (!b.departAt) return -1;
        return new Date(a.departAt).getTime() - new Date(b.departAt).getTime();
      });
    } catch (err) {
      this.error.set(toErrorMessage(err));
      return [];
    }
  }

  async create(input: NewTransportInput): Promise<Transport | undefined> {
    try {
      const transport: Transport = { ...createBaseEntityFields(), ...input };
      await this.repo.save(transport);
      await this.load(input.destinationId);
      return transport;
    } catch (err) {
      this.error.set(toErrorMessage(err));
      return undefined;
    }
  }

  async update(transport: Transport, changes: Partial<NewTransportInput>): Promise<void> {
    try {
      const updated: Transport = { ...transport, ...changes, ...touchTimestamps() };
      await this.repo.save(updated);
      await this.load(updated.destinationId);
    } catch (err) {
      this.error.set(toErrorMessage(err));
    }
  }

  async softDelete(id: string, destinationId: string): Promise<void> {
    try {
      await this.repo.softDelete(id);
      await this.load(destinationId);
    } catch (err) {
      this.error.set(toErrorMessage(err));
    }
  }
}
