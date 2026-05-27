export type ReportCellValue = string | number | boolean | null;

export interface ReportColumn {
  key: string;
  label: string;
  align?: 'left' | 'right' | 'center';
  format?: 'text' | 'currency' | 'date' | 'number';
}

export type ReportRow = Record<string, ReportCellValue>;

export interface ReportJSON {
  title: string;
  generatedAt: string;
  columns: ReportColumn[];
  rows: ReportRow[];
}

export abstract class Report {
  private readonly _title: string;
  private readonly _generatedAt: Date;
  protected _columns: ReportColumn[];
  protected _rows: ReportRow[];

  protected constructor(title: string) {
    this._title = title;
    this._generatedAt = new Date();
    this._columns = [];
    this._rows = [];
  }

  public get title(): string {
    return this._title;
  }

  public get generatedAt(): Date {
    return new Date(this._generatedAt);
  }

  public get columns(): ReportColumn[] {
    return this._columns.map((c) => ({ ...c }));
  }

  public get rows(): ReportRow[] {
    return this._rows.map((row) => ({ ...row }));
  }

  public abstract generate(): Promise<void>;

  public toJSON(): ReportJSON {
    return {
      title: this.title,
      generatedAt: this.generatedAt.toISOString(),
      columns: this.columns,
      rows: this.rows,
    };
  }
}
