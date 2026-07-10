/**
 * Application-facing port for exporting/importing an entire trip as a
 * portable ZIP archive (design §5, §10). The concrete implementation
 * (`TripArchiveService`, using `fflate`) lives in
 * `infrastructure/export/` — that dependency never escapes infrastructure.
 */
export interface TripArchive {
  /** Returns a ZIP Blob containing the trip's manifest + document assets. */
  export(travelId: string): Promise<Blob>;
  /** Imports a previously exported archive; returns the new local travelId. */
  import(archive: Blob): Promise<string>;
}
