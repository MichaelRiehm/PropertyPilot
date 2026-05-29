import { Request, Response } from 'express';
import { Tenant } from '../domain';
import { TenantRepository } from '../repositories';
import { NotFoundError } from '../errors';
import {
  idParamSchema,
  tenantCreateSchema,
  tenantListQuerySchema,
  tenantUpdateSchema,
} from '../schemas';

function serialize(t: Tenant) {
  return {
    id: t.id,
    ownerId: t.ownerId,
    firstName: t.firstName,
    lastName: t.lastName,
    fullName: t.fullName(),
    email: t.email,
    phone: t.phone,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

export class TenantController {
  public constructor(private readonly repo: TenantRepository) {}

  public list = async (req: Request, res: Response): Promise<void> => {
    const query = tenantListQuerySchema.parse(req.query);
    const result = await this.repo.list({ ...query, ownerId: req.user!.id });
    res.json({
      data: result.data.map(serialize),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      totalPages: result.totalPages,
    });
  };

  public get = async (req: Request, res: Response): Promise<void> => {
    const id = idParamSchema.parse(req.params).id;
    const tenant = await this.repo.findById(id, req.user!.id);
    if (!tenant) throw new NotFoundError('Tenant', id);
    res.json(serialize(tenant));
  };

  public create = async (req: Request, res: Response): Promise<void> => {
    const body = tenantCreateSchema.parse(req.body);
    const tenant = Tenant.create({
      ownerId: req.user!.id,
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      phone: body.phone ?? null,
    });
    const created = await this.repo.create(tenant);
    res.status(201).json(serialize(created));
  };

  public update = async (req: Request, res: Response): Promise<void> => {
    const id = idParamSchema.parse(req.params).id;
    const body = tenantUpdateSchema.parse(req.body);
    const ownerId = req.user!.id;
    const tenant = await this.repo.findById(id, ownerId);
    if (!tenant) throw new NotFoundError('Tenant', id);

    if (body.firstName !== undefined || body.lastName !== undefined) {
      tenant.updateName(
        body.firstName ?? tenant.firstName,
        body.lastName ?? tenant.lastName,
      );
    }
    if (body.email !== undefined || body.phone !== undefined) {
      tenant.updateContact({
        email: body.email ?? tenant.email,
        phone: body.phone !== undefined ? body.phone : tenant.phone,
      });
    }

    const updated = await this.repo.update(tenant, ownerId);
    res.json(serialize(updated));
  };

  public remove = async (req: Request, res: Response): Promise<void> => {
    const id = idParamSchema.parse(req.params).id;
    await this.repo.delete(id, req.user!.id);
    res.status(204).send();
  };
}
