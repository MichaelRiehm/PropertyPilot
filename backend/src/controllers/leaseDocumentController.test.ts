import { describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';
import { LeaseDocumentController } from './leaseDocumentController';
import { Lease } from '../domain';
import { HttpError, NotFoundError } from '../errors';
import type { LeaseRepository } from '../repositories';
import type { StorageService } from '../services/storageService';

function makeLeaseRepo(overrides: Partial<Record<string, ReturnType<typeof vi.fn>>> = {}) {
  return {
    findById: vi.fn(),
    update: vi.fn(),
    list: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
    ...overrides,
  } as unknown as LeaseRepository;
}

function makeStorage(overrides: Partial<Record<string, ReturnType<typeof vi.fn>>> = {}) {
  return {
    putObject: vi.fn().mockResolvedValue(undefined),
    deleteObject: vi.fn().mockResolvedValue(undefined),
    getSignedViewUrl: vi.fn().mockResolvedValue('https://signed.example/x'),
    ...overrides,
  } as unknown as StorageService;
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
  file?: { buffer: Buffer; mimetype: string; originalname: string };
} = {}): Request {
  return {
    user: { id: 'owner-1', email: 'owner@example.com' },
    params: opts.params ?? {},
    file: opts.file,
  } as unknown as Request;
}

function makeLease(overrides: Partial<Parameters<typeof Lease.create>[0]> = {}): Lease {
  return Lease.create({
    unitId: 'unit-1',
    tenantId: 'tenant-1',
    startDate: new Date('2026-01-01'),
    endDate: new Date('2027-01-01'),
    monthlyRent: 1500,
    securityDeposit: 1500,
    status: 'ACTIVE',
    documentLink: null,
    ...overrides,
  });
}

const PDF_FILE = {
  buffer: Buffer.from('%PDF-1.4 fake pdf content'),
  mimetype: 'application/pdf',
  originalname: 'lease.pdf',
};

describe('LeaseDocumentController.upload', () => {
  it('stores the file at leases/{id}/document.pdf, updates the lease, and returns a signed URL', async () => {
    const lease = makeLease();
    const leases = makeLeaseRepo({
      findById: vi.fn().mockResolvedValue(lease),
      update: vi.fn().mockImplementation(async (l: Lease) => l),
    });
    const storage = makeStorage();
    const controller = new LeaseDocumentController(leases, storage);
    const res = makeRes();

    await controller.upload(
      makeReq({ params: { id: lease.id }, file: PDF_FILE }),
      res,
    );

    expect(storage.putObject).toHaveBeenCalledWith(
      `leases/${lease.id}/document.pdf`,
      PDF_FILE.buffer,
      'application/pdf',
    );
    expect(storage.getSignedViewUrl).toHaveBeenCalledWith(`leases/${lease.id}/document.pdf`);
    const body = res.json.mock.calls[0][0];
    expect(body.documentKey).toBe(`leases/${lease.id}/document.pdf`);
    expect(body.documentUrl).toBe('https://signed.example/x');
  });

  it('rejects a request with no file with 400', async () => {
    const controller = new LeaseDocumentController(makeLeaseRepo(), makeStorage());

    await expect(
      controller.upload(makeReq({ params: { id: 'lease-1' } }), makeRes()),
    ).rejects.toBeInstanceOf(HttpError);
  });

  it('rejects a non-PDF content type with 400', async () => {
    const controller = new LeaseDocumentController(makeLeaseRepo(), makeStorage());
    const jpg = { buffer: Buffer.from('fake'), mimetype: 'image/jpeg', originalname: 'x.jpg' };

    await expect(
      controller.upload(makeReq({ params: { id: 'lease-1' }, file: jpg }), makeRes()),
    ).rejects.toBeInstanceOf(HttpError);
  });

  it('throws NotFoundError when the lease is not owned by the user', async () => {
    const leases = makeLeaseRepo({ findById: vi.fn().mockResolvedValue(null) });
    const controller = new LeaseDocumentController(leases, makeStorage());

    await expect(
      controller.upload(makeReq({ params: { id: 'lease-x' }, file: PDF_FILE }), makeRes()),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('LeaseDocumentController.getViewUrl', () => {
  it('returns a signed URL for an internally-stored document', async () => {
    const lease = makeLease({ documentLink: 'leases/lease-1/document.pdf' });
    const leases = makeLeaseRepo({ findById: vi.fn().mockResolvedValue(lease) });
    const storage = makeStorage();
    const controller = new LeaseDocumentController(leases, storage);
    const res = makeRes();

    await controller.getViewUrl(makeReq({ params: { id: lease.id } }), res);

    expect(storage.getSignedViewUrl).toHaveBeenCalledWith('leases/lease-1/document.pdf');
    const body = res.json.mock.calls[0][0];
    expect(body.url).toBe('https://signed.example/x');
    expect(body.external).toBe(false);
  });

  it('returns the external URL as-is for legacy documents', async () => {
    const lease = makeLease({ documentLink: 'https://drive.example/file/xyz' });
    const leases = makeLeaseRepo({ findById: vi.fn().mockResolvedValue(lease) });
    const storage = makeStorage();
    const controller = new LeaseDocumentController(leases, storage);
    const res = makeRes();

    await controller.getViewUrl(makeReq({ params: { id: lease.id } }), res);

    expect(storage.getSignedViewUrl).not.toHaveBeenCalled();
    const body = res.json.mock.calls[0][0];
    expect(body.url).toBe('https://drive.example/file/xyz');
    expect(body.external).toBe(true);
  });

  it('throws NotFoundError when the lease has no document', async () => {
    const lease = makeLease({ documentLink: null });
    const leases = makeLeaseRepo({ findById: vi.fn().mockResolvedValue(lease) });
    const controller = new LeaseDocumentController(leases, makeStorage());

    await expect(
      controller.getViewUrl(makeReq({ params: { id: lease.id } }), makeRes()),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('LeaseDocumentController.remove', () => {
  it('deletes the R2 object, clears the field, and returns 204', async () => {
    const lease = makeLease({ documentLink: 'leases/lease-1/document.pdf' });
    const leases = makeLeaseRepo({
      findById: vi.fn().mockResolvedValue(lease),
      update: vi.fn().mockImplementation(async (l: Lease) => l),
    });
    const storage = makeStorage();
    const controller = new LeaseDocumentController(leases, storage);
    const res = makeRes();

    await controller.remove(makeReq({ params: { id: lease.id } }), res);

    expect(storage.deleteObject).toHaveBeenCalledWith('leases/lease-1/document.pdf');
    expect(res.status).toHaveBeenCalledWith(204);
  });

  it('does not call R2 when the stored link is an external URL', async () => {
    const lease = makeLease({ documentLink: 'https://drive.example/file/xyz' });
    const leases = makeLeaseRepo({
      findById: vi.fn().mockResolvedValue(lease),
      update: vi.fn().mockImplementation(async (l: Lease) => l),
    });
    const storage = makeStorage();
    const controller = new LeaseDocumentController(leases, storage);
    const res = makeRes();

    await controller.remove(makeReq({ params: { id: lease.id } }), res);

    expect(storage.deleteObject).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(204);
  });
});
