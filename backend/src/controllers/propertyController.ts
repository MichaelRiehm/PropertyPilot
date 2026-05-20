import { Request, Response } from 'express';
import { Property } from '../domain';
import { PropertyRepository } from '../repositories';
import { NotFoundError } from '../errors';
import {
  idParamSchema,
  propertyCreateSchema,
  propertyListQuerySchema,
  propertyUpdateSchema,
} from '../schemas';

function serialize(p: Property) {
  return {
    id: p.id,
    ownerId: p.ownerId,
    name: p.name,
    addressLine1: p.addressLine1,
    addressLine2: p.addressLine2,
    city: p.city,
    state: p.state,
    postalCode: p.postalCode,
    propertyType: p.propertyType,
    fullAddress: p.fullAddress(),
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

export class PropertyController {
  public constructor(private readonly repo: PropertyRepository) {}

  public list = async (req: Request, res: Response): Promise<void> => {
    const query = propertyListQuerySchema.parse(req.query);
    const result = await this.repo.list(query);
    res.json({
      data: result.data.map(serialize),
      total: result.total,
      limit: result.limit,
      offset: result.offset,
    });
  };

  public get = async (req: Request, res: Response): Promise<void> => {
    const property = await this.repo.findById(idParamSchema.parse(req.params).id);
    if (!property) throw new NotFoundError('Property', idParamSchema.parse(req.params).id);
    res.json(serialize(property));
  };

  public create = async (req: Request, res: Response): Promise<void> => {
    const body = propertyCreateSchema.parse(req.body);
    const property = Property.create({
      ownerId: body.ownerId,
      name: body.name,
      addressLine1: body.addressLine1,
      addressLine2: body.addressLine2 ?? null,
      city: body.city,
      state: body.state,
      postalCode: body.postalCode,
      propertyType: body.propertyType ?? 'SINGLE_FAMILY',
    });
    const created = await this.repo.create(property);
    res.status(201).json(serialize(created));
  };

  public update = async (req: Request, res: Response): Promise<void> => {
    const body = propertyUpdateSchema.parse(req.body);
    const property = await this.repo.findById(idParamSchema.parse(req.params).id);
    if (!property) throw new NotFoundError('Property', idParamSchema.parse(req.params).id);

    if (body.name !== undefined) property.rename(body.name);
    if (
      body.addressLine1 !== undefined ||
      body.addressLine2 !== undefined ||
      body.city !== undefined ||
      body.state !== undefined ||
      body.postalCode !== undefined
    ) {
      property.updateAddress({
        addressLine1: body.addressLine1 ?? property.addressLine1,
        addressLine2:
          body.addressLine2 !== undefined ? body.addressLine2 : property.addressLine2,
        city: body.city ?? property.city,
        state: body.state ?? property.state,
        postalCode: body.postalCode ?? property.postalCode,
      });
    }
    if (body.propertyType !== undefined) property.changeType(body.propertyType);

    const updated = await this.repo.update(property);
    res.json(serialize(updated));
  };

  public remove = async (req: Request, res: Response): Promise<void> => {
    const property = await this.repo.findById(idParamSchema.parse(req.params).id);
    if (!property) throw new NotFoundError('Property', idParamSchema.parse(req.params).id);
    await this.repo.delete(property.id);
    res.status(204).send();
  };
}
