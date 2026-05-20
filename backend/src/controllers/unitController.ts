import { Request, Response } from 'express';
import { Unit } from '../domain';
import { UnitRepository } from '../repositories';
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
  public constructor(private readonly repo: UnitRepository) {}

  public list = async (req: Request, res: Response): Promise<void> => {
    const query = unitListQuerySchema.parse(req.query);
    const result = await this.repo.list(query);
    res.json({
      data: result.data.map(serialize),
      total: result.total,
      limit: result.limit,
      offset: result.offset,
    });
  };

  public get = async (req: Request, res: Response): Promise<void> => {
    const unit = await this.repo.findById(idParamSchema.parse(req.params).id);
    if (!unit) throw new NotFoundError('Unit', idParamSchema.parse(req.params).id);
    res.json(serialize(unit));
  };

  public create = async (req: Request, res: Response): Promise<void> => {
    const body = unitCreateSchema.parse(req.body);
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
    const body = unitUpdateSchema.parse(req.body);
    const unit = await this.repo.findById(idParamSchema.parse(req.params).id);
    if (!unit) throw new NotFoundError('Unit', idParamSchema.parse(req.params).id);

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

    const updated = await this.repo.update(unit);
    res.json(serialize(updated));
  };

  public remove = async (req: Request, res: Response): Promise<void> => {
    const unit = await this.repo.findById(idParamSchema.parse(req.params).id);
    if (!unit) throw new NotFoundError('Unit', idParamSchema.parse(req.params).id);
    await this.repo.delete(unit.id);
    res.status(204).send();
  };
}
