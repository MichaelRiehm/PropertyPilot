import { Router } from 'express';
import { DashboardController } from '../controllers/dashboardController';

export function createDashboardRouter(controller: DashboardController): Router {
  const router = Router();
  router.get('/', controller.summary);
  return router;
}
