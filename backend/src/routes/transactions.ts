import { Router } from 'express';
import { TransactionController } from '../controllers/transactionController';

export function createTransactionRouter(controller: TransactionController): Router {
  const router = Router();
  router.get('/', controller.list);
  router.post('/', controller.create);
  router.get('/:id', controller.get);
  router.patch('/:id', controller.update);
  router.delete('/:id', controller.remove);
  return router;
}
