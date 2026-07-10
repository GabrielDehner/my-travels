import { ErrorHandler, Injectable, inject } from '@angular/core';

import { toErrorMessage } from '../application/shared/error.util';
import { AppErrorState } from '../application/state/app-error.state';

/**
 * Global Angular `ErrorHandler` (design §15, task 5.9). Logs the error and
 * surfaces a non-blocking message via `AppErrorState`, rather than crashing
 * the app or showing a blocking dialog. Registered in `app.config.ts`.
 */
@Injectable()
export class AppErrorHandler implements ErrorHandler {
  private readonly errorState = inject(AppErrorState);

  handleError(error: unknown): void {
    // eslint-disable-next-line no-console -- global error handler is the intended sink for unhandled errors.
    console.error('Unhandled application error:', error);
    this.errorState.report(toErrorMessage(error));
  }
}
