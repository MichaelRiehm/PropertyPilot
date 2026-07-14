import { Request, Response } from 'express';
import { StorageService } from '../services/storageService';
import { LeaseRepository } from '../repositories';
import { HttpError, NotFoundError } from '../errors';
import { idParamSchema } from '../schemas';

/**
 * A stored value on `Lease.documentLink` is treated as an R2 key unless it
 * starts with `http` — in which case it's a legacy external URL from before
 * the upload flow existed. That preserves back-compat with any lease created
 * before this PR.
 */
function isExternalUrl(value: string): boolean {
  return value.startsWith('http://') || value.startsWith('https://');
}

function keyForLease(leaseId: string): string {
  return `leases/${leaseId}/document.pdf`;
}

export class LeaseDocumentController {
  public constructor(
    private readonly leases: LeaseRepository,
    private readonly storage: StorageService,
  ) {}

  public upload = async (req: Request, res: Response): Promise<void> => {
    const id = idParamSchema.parse(req.params).id;
    const ownerId = req.user!.id;

    if (!req.file) {
      throw new HttpError(400, 'No file uploaded. Attach a PDF as multipart field "document".');
    }
    if (req.file.mimetype !== 'application/pdf') {
      throw new HttpError(400, 'Only PDF documents are accepted (application/pdf).');
    }

    const lease = await this.leases.findById(id, ownerId);
    if (!lease) throw new NotFoundError('Lease', id);

    const key = keyForLease(id);
    await this.storage.putObject(key, req.file.buffer, 'application/pdf');

    lease.attachDocument(key);
    const updated = await this.leases.update(lease, ownerId);

    const viewUrl = await this.storage.getSignedViewUrl(key);
    res.json({
      documentKey: key,
      documentUrl: viewUrl,
      lease: {
        id: updated.id,
        documentLink: updated.documentLink,
      },
    });
  };

  public getViewUrl = async (req: Request, res: Response): Promise<void> => {
    const id = idParamSchema.parse(req.params).id;
    const ownerId = req.user!.id;

    const lease = await this.leases.findById(id, ownerId);
    if (!lease) throw new NotFoundError('Lease', id);
    if (!lease.documentLink) {
      throw new NotFoundError('Document for lease', id);
    }

    // Back-compat: legacy external URLs (Drive, Dropbox) go through unchanged.
    if (isExternalUrl(lease.documentLink)) {
      res.json({ url: lease.documentLink, external: true });
      return;
    }

    const viewUrl = await this.storage.getSignedViewUrl(lease.documentLink);
    res.json({ url: viewUrl, external: false, expiresInSeconds: 15 * 60 });
  };

  public remove = async (req: Request, res: Response): Promise<void> => {
    const id = idParamSchema.parse(req.params).id;
    const ownerId = req.user!.id;

    const lease = await this.leases.findById(id, ownerId);
    if (!lease) throw new NotFoundError('Lease', id);
    if (!lease.documentLink) {
      throw new NotFoundError('Document for lease', id);
    }

    // If the stored value is an internal R2 key, delete the object first.
    if (!isExternalUrl(lease.documentLink)) {
      await this.storage.deleteObject(lease.documentLink);
    }

    lease.attachDocument(null);
    await this.leases.update(lease, ownerId);
    res.status(204).send();
  };
}
