import { describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';
import { MaintenanceTicketController } from './maintenanceTicketController';
import { MaintenanceTicket, Property, Unit } from '../domain';
import { HttpError, NotFoundError } from '../errors';
import type {
  MaintenanceTicketRepository,
  PropertyRepository,
  UnitRepository,
} from '../repositories';

function makeRepo(overrides: Partial<Record<string, ReturnType<typeof vi.fn>>> = {}) {
  return {
    findById: vi.fn(),
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    ...overrides,
  } as unknown as MaintenanceTicketRepository;
}

function makePropertyRepo(overrides: Partial<Record<string, ReturnType<typeof vi.fn>>> = {}) {
  return { findById: vi.fn(), ...overrides } as unknown as PropertyRepository;
}

function makeUnitRepo(overrides: Partial<Record<string, ReturnType<typeof vi.fn>>> = {}) {
  return { findById: vi.fn(), ...overrides } as unknown as UnitRepository;
}

function makeRes() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  } as unknown as Response & {
    status: ReturnType<typeof vi.fn>;
    json: ReturnType<typeof vi.fn>;
    send: ReturnType<typeof vi.fn>;
  };
}

function makeReq(opts: {
  params?: Record<string, string>;
  body?: unknown;
  query?: Record<string, unknown>;
} = {}): Request {
  return {
    user: { id: 'owner-1', email: 'owner@example.com' },
    params: opts.params ?? {},
    query: opts.query ?? {},
    body: opts.body ?? {},
  } as unknown as Request;
}

function makeProperty(): Property {
  return Property.create({
    ownerId: 'owner-1',
    name: 'P',
    addressLine1: '1 Main',
    addressLine2: null,
    city: 'Madison',
    state: 'WI',
    postalCode: '53703',
    propertyType: 'DUPLEX',
  });
}

function makeUnit(): Unit {
  return Unit.create({
    propertyId: 'prop-1',
    label: 'A',
    bedrooms: 2,
    bathrooms: 1,
    squareFeet: 800,
    marketRent: 1200,
  });
}

function makeTicket(): MaintenanceTicket {
  return MaintenanceTicket.create({
    propertyId: 'prop-1',
    unitId: 'unit-1',
    title: 'Leaky faucet',
    description: 'Tenant reports drip',
    status: 'OPEN',
    priority: 'MEDIUM',
    reportedAt: new Date('2026-05-01'),
    resolvedAt: null,
  });
}

describe('MaintenanceTicketController.get', () => {
  it('returns the serialized ticket when found', async () => {
    const ticket = makeTicket();
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(ticket) });
    const controller = new MaintenanceTicketController(
      repo,
      makePropertyRepo(),
      makeUnitRepo(),
    );
    const res = makeRes();

    await controller.get(makeReq({ params: { id: ticket.id } }), res);

    const body = res.json.mock.calls[0][0];
    expect(body.title).toBe('Leaky faucet');
    expect(body.status).toBe('OPEN');
    expect(body.isOpen).toBe(true);
    expect(typeof body.ageInDays).toBe('number');
  });

  it('throws NotFoundError when the ticket is missing', async () => {
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(null) });
    const controller = new MaintenanceTicketController(
      repo,
      makePropertyRepo(),
      makeUnitRepo(),
    );

    await expect(
      controller.get(makeReq({ params: { id: 'missing' } }), makeRes()),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('MaintenanceTicketController.create', () => {
  it('verifies the parent property and creates the ticket', async () => {
    const property = makeProperty();
    const properties = makePropertyRepo({ findById: vi.fn().mockResolvedValue(property) });
    const repo = makeRepo({
      create: vi.fn().mockImplementation(async (t: MaintenanceTicket) => t),
    });
    const controller = new MaintenanceTicketController(repo, properties, makeUnitRepo());
    const res = makeRes();

    await controller.create(
      makeReq({
        body: {
          propertyId: property.id,
          title: 'Roof leak',
          description: 'Water stains after last storm',
          status: 'OPEN',
          priority: 'HIGH',
        },
      }),
      res,
    );

    expect(properties.findById).toHaveBeenCalledWith(property.id, 'owner-1');
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json.mock.calls[0][0].title).toBe('Roof leak');
  });

  it('verifies the attached unit belongs to the same owner', async () => {
    const property = makeProperty();
    const unit = makeUnit();
    const properties = makePropertyRepo({ findById: vi.fn().mockResolvedValue(property) });
    const units = makeUnitRepo({ findById: vi.fn().mockResolvedValue(unit) });
    const repo = makeRepo({
      create: vi.fn().mockImplementation(async (t: MaintenanceTicket) => t),
    });
    const controller = new MaintenanceTicketController(repo, properties, units);
    const res = makeRes();

    await controller.create(
      makeReq({
        body: {
          propertyId: property.id,
          unitId: unit.id,
          title: 'Kitchen sink slow drain',
          description: 'Likely hair clog',
          status: 'OPEN',
          priority: 'MEDIUM',
        },
      }),
      res,
    );

    expect(units.findById).toHaveBeenCalledWith(unit.id, 'owner-1');
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('throws NotFoundError when the parent property is not owned', async () => {
    const properties = makePropertyRepo({ findById: vi.fn().mockResolvedValue(null) });
    const controller = new MaintenanceTicketController(
      makeRepo(),
      properties,
      makeUnitRepo(),
    );

    await expect(
      controller.create(
        makeReq({
          body: {
            propertyId: 'someone-else',
            title: 'x',
            description: 'y',
            status: 'OPEN',
            priority: 'LOW',
          },
        }),
        makeRes(),
      ),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('throws NotFoundError when the attached unit is not owned', async () => {
    const properties = makePropertyRepo({ findById: vi.fn().mockResolvedValue(makeProperty()) });
    const units = makeUnitRepo({ findById: vi.fn().mockResolvedValue(null) });
    const controller = new MaintenanceTicketController(makeRepo(), properties, units);

    await expect(
      controller.create(
        makeReq({
          body: {
            propertyId: 'prop-1',
            unitId: 'unit-x',
            title: 'x',
            description: 'y',
            status: 'OPEN',
            priority: 'LOW',
          },
        }),
        makeRes(),
      ),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('rejects an empty title with a Zod error', async () => {
    const controller = new MaintenanceTicketController(
      makeRepo(),
      makePropertyRepo(),
      makeUnitRepo(),
    );

    await expect(
      controller.create(
        makeReq({
          body: {
            propertyId: 'prop-1',
            title: '',
            description: 'y',
            status: 'OPEN',
            priority: 'LOW',
          },
        }),
        makeRes(),
      ),
    ).rejects.toThrow();
  });
});

describe('MaintenanceTicketController.update', () => {
  it('updates title and description via the domain mutator', async () => {
    const ticket = makeTicket();
    const repo = makeRepo({
      findById: vi.fn().mockResolvedValue(ticket),
      update: vi.fn().mockImplementation(async (t: MaintenanceTicket) => t),
    });
    const controller = new MaintenanceTicketController(
      repo,
      makePropertyRepo(),
      makeUnitRepo(),
    );
    const res = makeRes();

    await controller.update(
      makeReq({
        params: { id: ticket.id },
        body: { title: 'Updated title', description: 'Updated description' },
      }),
      res,
    );

    const body = res.json.mock.calls[0][0];
    expect(body.title).toBe('Updated title');
    expect(body.description).toBe('Updated description');
  });

  it('transitions status to IN_PROGRESS via start()', async () => {
    const ticket = makeTicket();
    const repo = makeRepo({
      findById: vi.fn().mockResolvedValue(ticket),
      update: vi.fn().mockImplementation(async (t: MaintenanceTicket) => t),
    });
    const controller = new MaintenanceTicketController(
      repo,
      makePropertyRepo(),
      makeUnitRepo(),
    );
    const res = makeRes();

    await controller.update(
      makeReq({ params: { id: ticket.id }, body: { status: 'IN_PROGRESS' } }),
      res,
    );

    expect(res.json.mock.calls[0][0].status).toBe('IN_PROGRESS');
  });

  it('transitions status to CLOSED via close(), setting resolvedAt', async () => {
    const ticket = makeTicket();
    const repo = makeRepo({
      findById: vi.fn().mockResolvedValue(ticket),
      update: vi.fn().mockImplementation(async (t: MaintenanceTicket) => t),
    });
    const controller = new MaintenanceTicketController(
      repo,
      makePropertyRepo(),
      makeUnitRepo(),
    );
    const res = makeRes();

    await controller.update(
      makeReq({ params: { id: ticket.id }, body: { status: 'CLOSED' } }),
      res,
    );

    const body = res.json.mock.calls[0][0];
    expect(body.status).toBe('CLOSED');
    expect(body.resolvedAt).not.toBeNull();
  });

  it('rejects a transition back to OPEN with a 400', async () => {
    const ticket = MaintenanceTicket.create({
      propertyId: 'prop-1',
      unitId: null,
      title: 'x',
      description: 'y',
      status: 'CLOSED',
      priority: 'MEDIUM',
      reportedAt: new Date('2026-01-01'),
      resolvedAt: new Date('2026-01-15'),
    });
    const repo = makeRepo({
      findById: vi.fn().mockResolvedValue(ticket),
      update: vi.fn().mockImplementation(async (t: MaintenanceTicket) => t),
    });
    const controller = new MaintenanceTicketController(
      repo,
      makePropertyRepo(),
      makeUnitRepo(),
    );

    await expect(
      controller.update(
        makeReq({ params: { id: ticket.id }, body: { status: 'OPEN' } }),
        makeRes(),
      ),
    ).rejects.toBeInstanceOf(HttpError);
  });

  it('throws NotFoundError when the ticket is missing', async () => {
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(null) });
    const controller = new MaintenanceTicketController(
      repo,
      makePropertyRepo(),
      makeUnitRepo(),
    );

    await expect(
      controller.update(
        makeReq({ params: { id: 'missing' }, body: { priority: 'HIGH' } }),
        makeRes(),
      ),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('MaintenanceTicketController.remove', () => {
  it('returns 204 on success', async () => {
    const repo = makeRepo({ delete: vi.fn().mockResolvedValue(undefined) });
    const controller = new MaintenanceTicketController(
      repo,
      makePropertyRepo(),
      makeUnitRepo(),
    );
    const res = makeRes();

    await controller.remove(makeReq({ params: { id: 't-1' } }), res);

    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.send).toHaveBeenCalled();
  });
});
