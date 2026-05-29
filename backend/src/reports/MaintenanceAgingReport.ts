import { Report } from './Report';
import {
  MaintenanceTicketRepository,
  PropertyRepository,
  UnitRepository,
} from '../repositories';

export interface MaintenanceAgingOptions {
  ownerId: string;
  propertyId?: string;
  asOf?: Date;
}

function bucketForAge(days: number): string {
  if (days <= 7) return '0-7 days';
  if (days <= 30) return '8-30 days';
  if (days <= 60) return '31-60 days';
  return '61+ days';
}

const PRIORITY_ORDER: Record<string, number> = {
  URGENT: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

export class MaintenanceAgingReport extends Report {
  public constructor(
    private readonly tickets: MaintenanceTicketRepository,
    private readonly properties: PropertyRepository,
    private readonly units: UnitRepository,
    private readonly options: MaintenanceAgingOptions,
  ) {
    super('Maintenance Aging');
    this._columns = [
      { key: 'property', label: 'Property' },
      { key: 'unit', label: 'Unit' },
      { key: 'title', label: 'Title' },
      { key: 'priority', label: 'Priority' },
      { key: 'status', label: 'Status' },
      { key: 'reportedAt', label: 'Reported', format: 'date' },
      { key: 'ageDays', label: 'Age (days)', format: 'number', align: 'right' },
      { key: 'bucket', label: 'Aging bucket' },
    ];
  }

  public async generate(): Promise<void> {
    const { ownerId, propertyId, asOf } = this.options;
    const asOfDate = asOf ?? new Date();

    const [ticketsResult, propertiesResult, unitsResult] = await Promise.all([
      this.tickets.list({
        ownerId,
        propertyId,
        openOnly: true,
        page: 1,
        pageSize: 200,
      }),
      this.properties.list({ ownerId, page: 1, pageSize: 200 }),
      this.units.list({ ownerId, page: 1, pageSize: 200 }),
    ]);

    const propertyById = new Map(propertiesResult.data.map((p) => [p.id, p]));
    const unitById = new Map(unitsResult.data.map((u) => [u.id, u]));

    const tickets = ticketsResult.data.slice().sort((a, b) => {
      const ageDiff = b.ageInDays(asOfDate) - a.ageInDays(asOfDate);
      if (ageDiff !== 0) return ageDiff;
      const pa = PRIORITY_ORDER[a.priority] ?? 99;
      const pb = PRIORITY_ORDER[b.priority] ?? 99;
      return pa - pb;
    });

    this._rows = tickets.map((ticket) => {
      const property = propertyById.get(ticket.propertyId);
      const unit = ticket.unitId ? unitById.get(ticket.unitId) : null;
      const ageDays = ticket.ageInDays(asOfDate);
      return {
        property: property?.name ?? '—',
        unit: unit?.label ?? '—',
        title: ticket.title,
        priority: ticket.priority,
        status: ticket.status,
        reportedAt: ticket.reportedAt.toISOString().slice(0, 10),
        ageDays,
        bucket: bucketForAge(ageDays),
      };
    });
  }
}
