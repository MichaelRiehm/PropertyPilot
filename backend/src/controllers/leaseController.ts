import { Request, Response } from 'express';
import { Lease } from '../domain';
import { LeaseRepository } from '../repositories';
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
  public constructor(private readonly repo: LeaseRepository) {}

  public list = async (req: Request, res: Response): Promise<void> => {
    const query = leaseListQuerySchema.parse(req.query);
    const result = await this.repo.list(query);
    res.json({
      data: result.data.map(serialize),
      total: result.total,
      limit: result.limit,
      offset: result.offset,
    });
  };

  public get = async (req: Request, res: Response): Promise<void> => {
    const id = idParamSchema.parse(req.params).id;
    const lease = await this.repo.findById(id);
    if (!lease) throw new NotFoundError('Lease', id);
    res.json(serialize(lease));
  };

  public create = async (req: Request, res: Response): Promise<void> => {
    const body = leaseCreateSchema.parse(req.body);
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
    const lease = await this.repo.findById(id);
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

    const updated = await this.repo.update(lease);
    res.json(serialize(updated));
  };

  public remove = async (req: Request, res: Response): Promise<void> => {
    const id = idParamSchema.parse(req.params).id;
    const lease = await this.repo.findById(id);
    if (!lease) throw new NotFoundError('Lease', id);
    await this.repo.delete(lease.id);
    res.status(204).send();
  };
}
