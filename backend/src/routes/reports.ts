import { Router } from 'express';
import { ReportsController } from '../controllers/reportsController';

export function createReportsRouter(controller: ReportsController): Router {
  const router = Router();
  router.get('/rent-roll', controller.rentRoll);
  router.get('/pnl', controller.pnl);
  router.get('/occupancy', controller.occupancy);
  router.get('/maintenance-aging', controller.maintenanceAging);
  return router;
}
