import { Router } from 'express';
import multer from 'multer';
import { LeaseController } from '../controllers/leaseController';
import { LeaseDocumentController } from '../controllers/leaseDocumentController';
import { uploadRateLimiter } from '../middleware/rateLimiter';

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

// In-memory upload — a lease PDF is small, no reason to touch disk.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES },
});

export function createLeaseRouter(
  controller: LeaseController,
  documentController: LeaseDocumentController | null,
): Router {
  const router = Router();
  router.get('/', controller.list);
  router.post('/', controller.create);
  router.get('/:id', controller.get);
  router.patch('/:id', controller.update);
  router.delete('/:id', controller.remove);

  if (documentController) {
    router.post(
      '/:id/document',
      uploadRateLimiter,
      upload.single('document'),
      documentController.upload,
    );
    router.get('/:id/document', documentController.getViewUrl);
    router.delete('/:id/document', documentController.remove);
  }

  return router;
}
