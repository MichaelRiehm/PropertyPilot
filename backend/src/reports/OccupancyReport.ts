import { Report } from './Report';
import {
  LeaseRepository,
  PropertyRepository,
  UnitRepository,
} from '../repositories';

export interface OccupancyOptions {
  ownerId: string;
  propertyId?: string;
  asOf?: Date;
}

export class OccupancyReport extends Report {
  public constructor(
    private readonly properties: PropertyRepository,
    private readonly units: UnitRepository,
    private readonly leases: LeaseRepository,
    private readonly options: OccupancyOptions,
  ) {
    super('Occupancy');
    this._columns = [
      { key: 'property', label: 'Property' },
      { key: 'totalUnits', label: 'Total units', format: 'number', align: 'right' },
      { key: 'occupiedUnits', label: 'Occupied', format: 'number', align: 'right' },
      { key: 'vacantUnits', label: 'Vacant', format: 'number', align: 'right' },
      { key: 'occupancyRate', label: 'Occupancy', align: 'right' },
    ];
  }

  public async generate(): Promise<void> {
    const { ownerId, propertyId, asOf } = this.options;
    const asOfDate = asOf ?? new Date();

    const [properties, units, leases] = await Promise.all([
      this.properties.list({ ownerId, page: 1, pageSize: 200 }),
      this.units.list({ ownerId, page: 1, pageSize: 200 }),
      this.leases.list({ ownerId, status: 'ACTIVE', page: 1, pageSize: 200 }),
    ]);

    const filteredProperties = propertyId
      ? properties.data.filter((p) => p.id === propertyId)
      : properties.data;

    const unitsByProperty = new Map<string, string[]>();
    for (const unit of units.data) {
      const arr = unitsByProperty.get(unit.propertyId) ?? [];
      arr.push(unit.id);
      unitsByProperty.set(unit.propertyId, arr);
    }

    const occupiedUnitIds = new Set<string>();
    for (const lease of leases.data) {
      if (lease.startDate <= asOfDate && lease.endDate >= asOfDate) {
        occupiedUnitIds.add(lease.unitId);
      }
    }

    let totalAll = 0;
    let occupiedAll = 0;
    const rows = filteredProperties
      .map((property) => {
        const unitIds = unitsByProperty.get(property.id) ?? [];
        const total = unitIds.length;
        const occupied = unitIds.filter((id) => occupiedUnitIds.has(id)).length;
        const vacant = total - occupied;
        totalAll += total;
        occupiedAll += occupied;
        return {
          property: property.name,
          totalUnits: total,
          occupiedUnits: occupied,
          vacantUnits: vacant,
          occupancyRate: total === 0 ? 'n/a' : `${Math.round((occupied / total) * 100)}%`,
        };
      })
      .sort((a, b) => String(a.property).localeCompare(String(b.property)));

    if (rows.length === 0) {
      this._rows = [];
      return;
    }

    const vacantAll = totalAll - occupiedAll;
    rows.push({
      property: 'Total',
      totalUnits: totalAll,
      occupiedUnits: occupiedAll,
      vacantUnits: vacantAll,
      occupancyRate: totalAll === 0 ? 'n/a' : `${Math.round((occupiedAll / totalAll) * 100)}%`,
    });
    this._rows = rows;
  }
}
