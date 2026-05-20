import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import {
  PropertyRepository,
  UnitRepository,
  TenantRepository,
} from '../repositories';
import { PropertyController } from '../controllers/propertyController';
import { UnitController } from '../controllers/unitController';
import { TenantController } from '../controllers/tenantController';
import { createPropertyRouter } from './properties';
import { createUnitRouter } from './units';
import { createTenantRouter } from './tenants';

export function createApiRouter(prisma: PrismaClient): Router {
  const propertyRepo = new PropertyRepository(prisma);
  const unitRepo = new UnitRepository(prisma);
  const tenantRepo = new TenantRepository(prisma);

  const propertyController = new PropertyController(propertyRepo);
  const unitController = new UnitController(unitRepo);
  const tenantController = new TenantController(tenantRepo);

  const router = Router();
  router.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });
  router.use('/properties', createPropertyRouter(propertyController));
  router.use('/units', createUnitRouter(unitController));
  router.use('/tenants', createTenantRouter(tenantController));
  return router;
}
