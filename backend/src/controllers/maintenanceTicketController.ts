import { Request, Response } from 'express';
import { MaintenanceTicket } from '../domain';
import {
  MaintenanceTicketRepository,
  PropertyRepository,
  UnitRepository,
} from '../repositories';
import { HttpError, NotFoundError } from '../errors';
import {
  idParamSchema,
  maintenanceTicketCreateSchema,
  maintenanceTicketListQuerySchema,
  maintenanceTicketUpdateSchema,
} from '../schemas';

function serialize(t: MaintenanceTicket) {
  return {
    id: t.id,
    propertyId: t.propertyId,
    unitId: t.unitId,
    title: t.title,
    description: t.description,
    status: t.status,
    priority: t.priority,
    reportedAt: t.reportedAt.toISOString(),
    resolvedAt: t.resolvedAt ? t.resolvedAt.toISOString() : null,
    ageInDays: t.ageInDays(),
    isOpen: t.isOpen(),
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

export class MaintenanceTicketController {
  public constructor(
    private readonly repo: MaintenanceTicketRepository,
    private readonly properties: PropertyRepository,
    private readonly units: UnitRepository,
  ) {}

  public list = async (req: Request, res: Response): Promise<void> => {
    const query = maintenanceTicketListQuerySchema.parse(req.query);
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
    const ticket = await this.repo.findById(id, req.user!.id);
    if (!ticket) throw new NotFoundError('MaintenanceTicket', id);
    res.json(serialize(ticket));
  };

  public create = async (req: Request, res: Response): Promise<void> => {
    const body = maintenanceTicketCreateSchema.parse(req.body);
    const ownerId = req.user!.id;

    // Verify the property belongs to this owner. If a unit is attached,
    // verify it belongs too — a user cannot create a ticket that crosses
    // ownership boundaries.
    const property = await this.properties.findById(body.propertyId, ownerId);
    if (!property) throw new NotFoundError('Property', body.propertyId);

    if (body.unitId) {
      const unit = await this.units.findById(body.unitId, ownerId);
      if (!unit) throw new NotFoundError('Unit', body.unitId);
    }

    const ticket = MaintenanceTicket.create({
      propertyId: body.propertyId,
      unitId: body.unitId ?? null,
      title: body.title,
      description: body.description,
      status: body.status,
      priority: body.priority,
      reportedAt: body.reportedAt ?? new Date(),
      resolvedAt: body.resolvedAt ?? null,
    });
    const created = await this.repo.create(ticket);
    res.status(201).json(serialize(created));
  };

  public update = async (req: Request, res: Response): Promise<void> => {
    const id = idParamSchema.parse(req.params).id;
    const body = maintenanceTicketUpdateSchema.parse(req.body);
    const ownerId = req.user!.id;
    const ticket = await this.repo.findById(id, ownerId);
    if (!ticket) throw new NotFoundError('MaintenanceTicket', id);

    if (body.title !== undefined || body.description !== undefined) {
      ticket.updateDetails({
        title: body.title ?? ticket.title,
        description: body.description ?? ticket.description,
      });
    }
    if (body.priority !== undefined) ticket.setPriority(body.priority);
    if (body.status !== undefined) {
      applyStatusTransition(ticket, body.status, body.resolvedAt ?? undefined);
    }

    const updated = await this.repo.update(ticket, ownerId);
    res.json(serialize(updated));
  };

  public remove = async (req: Request, res: Response): Promise<void> => {
    const id = idParamSchema.parse(req.params).id;
    await this.repo.delete(id, req.user!.id);
    res.status(204).send();
  };
}

// Route status transitions through the domain's intention-revealing mutators.
// The domain doesn't expose a "reopen" method, so moving back to OPEN is
// explicitly disallowed at this layer — surface a 400 rather than silently
// mutating private state.
function applyStatusTransition(
  ticket: MaintenanceTicket,
  target: 'OPEN' | 'IN_PROGRESS' | 'CLOSED' | 'CANCELED',
  resolvedAt?: Date,
): void {
  if (target === ticket.status) return;
  switch (target) {
    case 'IN_PROGRESS':
      ticket.start();
      return;
    case 'CLOSED':
      ticket.close(resolvedAt);
      return;
    case 'CANCELED':
      ticket.cancel();
      return;
    case 'OPEN':
      throw new HttpError(400, 'Reopening a closed or canceled ticket is not supported');
  }
}
