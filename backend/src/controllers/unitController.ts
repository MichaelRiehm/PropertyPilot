import { Request, Response } from 'express';
import { Unit } from '../domain';
import { PropertyRepository, UnitRepository } from '../repositories';
import { NotFoundError } from '../errors';
import {
  idParamSchema,
  unitCreateSchema,
  unitListQuerySchema,
  unitUpdateSchema,
} from '../schemas';

function serialize(u: Unit) {
  return {
    id: u.id,
    propertyId: u.propertyId,
    label: u.label,
    bedrooms: u.bedrooms,
    bathrooms: u.bathrooms,
    squareFeet: u.squareFeet,
    marketRent: u.marketRent,
    createdAt: u.createdAt.toISOString(),
    updatedAt: u.updatedAt.toISOString(),
  };
}

export class UnitController {
  public constructor(
    private readonly repo: UnitRepository,
    private readonly properties: PropertyRepository,
  ) {}

  public list = async (req: Request, res: Response): Promise<void> => {
    const query = unitListQuerySchema.parse(req.query);
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
    const unit = await this.repo.findById(id, req.user!.id);
    if (!unit) throw new NotFoundError('Unit', id);
    res.json(serialize(unit));
  };

  public create = async (req: Request, res: Response): Promise<void> => {
    const body = unitCreateSchema.parse(req.body);
    const ownerId = req.user!.id;

    // Verify the parent property belongs to the authenticated user.
    const property = await this.properties.findById(body.propertyId, ownerId);
    if (!property) throw new NotFoundError('Property', body.propertyId);

    const unit = Unit.create({
      propertyId: body.propertyId,
      label: body.label,
      bedrooms: body.bedrooms,
      bathrooms: body.bathrooms,
      squareFeet: body.squareFeet ?? null,
      marketRent: body.marketRent,
    });
    const created = await this.repo.create(unit);
    res.status(201).json(serialize(created));
  };

  public update = async (req: Request, res: Response): Promise<void> => {
    const id = idParamSchema.parse(req.params).id;
    const body = unitUpdateSchema.parse(req.body);
    const ownerId = req.user!.id;
    const unit = await this.repo.findById(id, ownerId);
    if (!unit) throw new NotFoundError('Unit', id);

    if (body.label !== undefined) unit.relabel(body.label);
    if (
      body.bedrooms !== undefined ||
      body.bathrooms !== undefined ||
      body.squareFeet !== undefined
    ) {
      unit.updateSpecs({
        bedrooms: body.bedrooms ?? unit.bedrooms,
        bathrooms: body.bathrooms ?? unit.bathrooms,
        squareFeet:
          body.squareFeet !== undefined ? body.squareFeet : unit.squareFeet,
      });
    }
    if (body.marketRent !== undefined) unit.setMarketRent(body.marketRent);

    const updated = await this.repo.update(unit, ownerId);
    res.json(serialize(updated));
  };

  public remove = async (req: Request, res: Response): Promise<void> => {
    const id = idParamSchema.parse(req.params).id;
    await this.repo.delete(id, req.user!.id);
    res.status(204).send();
  };
}
