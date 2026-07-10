/**
 * Normalizes an unknown thrown value into a user-facing message
 * (design §15 — services catch and expose an `error` signal).
 */
export function toErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'An unexpected error occurred.';
}
