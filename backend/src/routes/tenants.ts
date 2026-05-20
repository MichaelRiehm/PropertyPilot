import { Router } from 'express';
import { TenantController } from '../controllers/tenantController';

export function createTenantRouter(controller: TenantController): Router {
  const router = Router();
  router.get('/', controller.list);
  router.post('/', controller.create);
  router.get('/:id', controller.get);
  router.patch('/:id', controller.update);
  router.delete('/:id', controller.remove);
  return router;
}
