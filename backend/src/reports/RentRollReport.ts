import { Report } from './Report';
import {
  LeaseRepository,
  PropertyRepository,
  TenantRepository,
  UnitRepository,
} from '../repositories';

export interface RentRollOptions {
  ownerId: string;
  propertyId?: string;
  asOf?: Date;
}

export class RentRollReport extends Report {
  public constructor(
    private readonly properties: PropertyRepository,
    private readonly units: UnitRepository,
    private readonly tenants: TenantRepository,
    private readonly leases: LeaseRepository,
    private readonly options: RentRollOptions,
  ) {
    super('Rent Roll');
    this._columns = [
      { key: 'property', label: 'Property' },
      { key: 'unit', label: 'Unit' },
      { key: 'tenant', label: 'Tenant' },
      { key: 'leaseStart', label: 'Lease start', format: 'date' },
      { key: 'leaseEnd', label: 'Lease end', format: 'date' },
      { key: 'monthlyRent', label: 'Monthly rent', format: 'currency', align: 'right' },
      { key: 'securityDeposit', label: 'Deposit', format: 'currency', align: 'right' },
      { key: 'status', label: 'Status' },
    ];
  }

  public async generate(): Promise<void> {
    const { ownerId, propertyId, asOf } = this.options;
    const [leases, units, properties, tenants] = await Promise.all([
      this.leases.list({ ownerId, limit: 200, offset: 0 }),
      this.units.list({ ownerId, limit: 200, offset: 0 }),
      this.properties.list({ ownerId, limit: 200, offset: 0 }),
      this.tenants.list({ ownerId, limit: 200, offset: 0 }),
    ]);

    const unitById = new Map(units.data.map((u) => [u.id, u]));
    const propertyById = new Map(properties.data.map((p) => [p.id, p]));
    const tenantById = new Map(tenants.data.map((t) => [t.id, t]));

    const filtered = leases.data.filter((lease) => {
      const unit = unitById.get(lease.unitId);
      if (!unit) return false;
      if (propertyId && unit.propertyId !== propertyId) return false;
      if (asOf) {
        if (lease.startDate > asOf) return false;
        if (lease.endDate < asOf) return false;
      }
      return true;
    });

    filtered.sort((a, b) => {
      const propA = propertyById.get(unitById.get(a.unitId)?.propertyId ?? '')?.name ?? '';
      const propB = propertyById.get(unitById.get(b.unitId)?.propertyId ?? '')?.name ?? '';
      if (propA !== propB) return propA.localeCompare(propB);
      const unitA = unitById.get(a.unitId)?.label ?? '';
      const unitB = unitById.get(b.unitId)?.label ?? '';
      return unitA.localeCompare(unitB);
    });

    this._rows = filtered.map((lease) => {
      const unit = unitById.get(lease.unitId);
      const property = unit ? propertyById.get(unit.propertyId) : undefined;
      const tenant = tenantById.get(lease.tenantId);
      return {
        property: property?.name ?? '—',
        unit: unit?.label ?? '—',
        tenant: tenant?.fullName() ?? '—',
        leaseStart: lease.startDate.toISOString().slice(0, 10),
        leaseEnd: lease.endDate.toISOString().slice(0, 10),
        monthlyRent: lease.monthlyRent,
        securityDeposit: lease.securityDeposit,
        status: lease.status,
      };
    });
  }
}
