import { Router } from 'express';
import { LeaseController } from '../controllers/leaseController';

export function createLeaseRouter(controller: LeaseController): Router {
  const router = Router();
  router.get('/', controller.list);
  router.post('/', controller.create);
  router.get('/:id', controller.get);
  router.patch('/:id', controller.update);
  router.delete('/:id', controller.remove);
  return router;
}
