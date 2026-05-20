import { Router } from 'express';
import { PropertyController } from '../controllers/propertyController';

export function createPropertyRouter(controller: PropertyController): Router {
  const router = Router();
  router.get('/', controller.list);
  router.post('/', controller.create);
  router.get('/:id', controller.get);
  router.patch('/:id', controller.update);
  router.delete('/:id', controller.remove);
  return router;
}
