import { Router } from 'express';
import { UnitController } from '../controllers/unitController';

export function createUnitRouter(controller: UnitController): Router {
  const router = Router();
  router.get('/', controller.list);
  router.post('/', controller.create);
  router.get('/:id', controller.get);
  router.patch('/:id', controller.update);
  router.delete('/:id', controller.remove);
  return router;
}
