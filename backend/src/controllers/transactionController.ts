import { Request, Response } from 'express';
import { Transaction } from '../domain';
import {
  LeaseRepository,
  PropertyRepository,
  TransactionRepository,
  UnitRepository,
} from '../repositories';
import { NotFoundError } from '../errors';
import {
  idParamSchema,
  transactionCreateSchema,
  transactionListQuerySchema,
  transactionUpdateSchema,
} from '../schemas';

function serialize(t: Transaction) {
  return {
    id: t.id,
    propertyId: t.propertyId,
    unitId: t.unitId,
    leaseId: t.leaseId,
    type: t.type,
    category: t.category,
    amount: t.amount,
    signedAmount: t.signedAmount(),
    isIncome: t.isIncome(),
    date: t.date.toISOString(),
    description: t.description,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

export class TransactionController {
  public constructor(
    private readonly repo: TransactionRepository,
    private readonly properties: PropertyRepository,
    private readonly units: UnitRepository,
    private readonly leases: LeaseRepository,
  ) {}

  public list = async (req: Request, res: Response): Promise<void> => {
    const query = transactionListQuerySchema.parse(req.query);
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
    const transaction = await this.repo.findById(id, req.user!.id);
    if (!transaction) throw new NotFoundError('Transaction', id);
    res.json(serialize(transaction));
  };

  public create = async (req: Request, res: Response): Promise<void> => {
    const body = transactionCreateSchema.parse(req.body);
    const ownerId = req.user!.id;

    // Verify the property belongs to this owner. The schema's optional unit/lease
    // references are also verified via ownerId so a user cannot create a
    // transaction that crosses ownership boundaries.
    const property = await this.properties.findById(body.propertyId, ownerId);
    if (!property) throw new NotFoundError('Property', body.propertyId);

    if (body.unitId) {
      const unit = await this.units.findById(body.unitId, ownerId);
      if (!unit) throw new NotFoundError('Unit', body.unitId);
    }
    if (body.leaseId) {
      const lease = await this.leases.findById(body.leaseId, ownerId);
      if (!lease) throw new NotFoundError('Lease', body.leaseId);
    }

    const transaction = Transaction.create({
      propertyId: body.propertyId,
      unitId: body.unitId ?? null,
      leaseId: body.leaseId ?? null,
      type: body.type,
      category: body.category ?? null,
      amount: body.amount,
      date: body.date,
      description: body.description,
    });
    const created = await this.repo.create(transaction);
    res.status(201).json(serialize(created));
  };

  public update = async (req: Request, res: Response): Promise<void> => {
    const id = idParamSchema.parse(req.params).id;
    const body = transactionUpdateSchema.parse(req.body);
    const ownerId = req.user!.id;
    const transaction = await this.repo.findById(id, ownerId);
    if (!transaction) throw new NotFoundError('Transaction', id);

    if (body.category !== undefined) transaction.reclassify(body.category);
    if (body.amount !== undefined) transaction.correctAmount(body.amount);
    if (body.description !== undefined) transaction.updateDescription(body.description);

    const updated = await this.repo.update(transaction, ownerId);
    res.json(serialize(updated));
  };

  public remove = async (req: Request, res: Response): Promise<void> => {
    const id = idParamSchema.parse(req.params).id;
    await this.repo.delete(id, req.user!.id);
    res.status(204).send();
  };
}
