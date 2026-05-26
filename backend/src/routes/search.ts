import { Router } from 'express';
import { SearchController } from '../controllers/searchController';

export function createSearchRouter(controller: SearchController): Router {
  const router = Router();
  router.get('/', controller.search);
  return router;
}
