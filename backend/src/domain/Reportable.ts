export interface Reportable {
  toReportRow(): Record<string, unknown>;
}
