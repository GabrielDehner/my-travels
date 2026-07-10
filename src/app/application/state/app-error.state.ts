import { Injectable, signal } from '@angular/core';

/**
 * Global, application-wide error signal (design §14, §15 — task 5.9).
 * Distinct from a service's own local `error` signal (which surfaces a
 * specific use-case failure): this store is the sink for cross-cutting,
 * unhandled errors reported by the global `AppErrorHandler` (core/), so a
 * single non-blocking UI element (e.g. a toast in the app shell) can
 * surface them regardless of which layer raised them.
 */
@Injectable({ providedIn: 'root' })
export class AppErrorState {
  private readonly _error = signal<string | null>(null);
  readonly error = this._error.asReadonly();

  report(message: string): void {
    this._error.set(message);
  }

  clear(): void {
    this._error.set(null);
  }
}
