import { Router } from 'express';
import { ForecastController } from '../controllers/forecastController';

export function createForecastRouter(controller: ForecastController): Router {
  const router = Router();
  router.get('/:propertyId', controller.forecast);
  return router;
}
