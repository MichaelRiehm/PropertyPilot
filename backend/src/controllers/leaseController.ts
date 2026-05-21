import { Request, Response } from 'express';
import { Lease } from '../domain';
import {
  LeaseRepository,
  TenantRepository,
  UnitRepository,
} from '../repositories';
import { NotFoundError } from '../errors';
import {
  idParamSchema,
  leaseCreateSchema,
  leaseListQuerySchema,
  leaseUpdateSchema,
} from '../schemas';

function serialize(l: Lease) {
  return {
    id: l.id,
    unitId: l.unitId,
    tenantId: l.tenantId,
    startDate: l.startDate.toISOString(),
    endDate: l.endDate.toISOString(),
    monthlyRent: l.monthlyRent,
    securityDeposit: l.securityDeposit,
    status: l.status,
    documentLink: l.documentLink,
    termInMonths: l.termInMonths(),
    createdAt: l.createdAt.toISOString(),
    updatedAt: l.updatedAt.toISOString(),
  };
}

export class LeaseController {
  public constructor(
    private readonly repo: LeaseRepository,
    private readonly units: UnitRepository,
    private readonly tenants: TenantRepository,
  ) {}

  public list = async (req: Request, res: Response): Promise<void> => {
    const query = leaseListQuerySchema.parse(req.query);
    const result = await this.repo.list({ ...query, ownerId: req.user!.id });
    res.json({
      data: result.data.map(serialize),
      total: result.total,
      limit: result.limit,
      offset: result.offset,
    });
  };

  public get = async (req: Request, res: Response): Promise<void> => {
    const id = idParamSchema.parse(req.params).id;
    const lease = await this.repo.findById(id, req.user!.id);
    if (!lease) throw new NotFoundError('Lease', id);
    res.json(serialize(lease));
  };

  public create = async (req: Request, res: Response): Promise<void> => {
    const body = leaseCreateSchema.parse(req.body);
    const ownerId = req.user!.id;

    // Verify both the unit and the tenant belong to this owner.
    const unit = await this.units.findById(body.unitId, ownerId);
    if (!unit) throw new NotFoundError('Unit', body.unitId);
    const tenant = await this.tenants.findById(body.tenantId, ownerId);
    if (!tenant) throw new NotFoundError('Tenant', body.tenantId);

    const lease = Lease.create({
      unitId: body.unitId,
      tenantId: body.tenantId,
      startDate: body.startDate,
      endDate: body.endDate,
      monthlyRent: body.monthlyRent,
      securityDeposit: body.securityDeposit,
      status: body.status ?? 'PENDING',
      documentLink: body.documentLink ?? null,
    });
    const created = await this.repo.create(lease);
    res.status(201).json(serialize(created));
  };

  public update = async (req: Request, res: Response): Promise<void> => {
    const id = idParamSchema.parse(req.params).id;
    const body = leaseUpdateSchema.parse(req.body);
    const ownerId = req.user!.id;
    const lease = await this.repo.findById(id, ownerId);
    if (!lease) throw new NotFoundError('Lease', id);

    if (body.endDate !== undefined) lease.extendTo(body.endDate);
    if (body.monthlyRent !== undefined || body.securityDeposit !== undefined) {
      lease.setRent(
        body.monthlyRent ?? lease.monthlyRent,
        body.securityDeposit ?? lease.securityDeposit,
      );
    }
    if (body.status !== undefined) lease.setStatus(body.status);
    if (body.documentLink !== undefined) lease.attachDocument(body.documentLink);

    const updated = await this.repo.update(lease, ownerId);
    res.json(serialize(updated));
  };

  public remove = async (req: Request, res: Response): Promise<void> => {
    const id = idParamSchema.parse(req.params).id;
    await this.repo.delete(id, req.user!.id);
    res.status(204).send();
  };
}
