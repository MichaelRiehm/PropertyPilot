import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import {
  PropertyRepository,
  UnitRepository,
  TenantRepository,
  LeaseRepository,
  TransactionRepository,
  UserRepository,
  MaintenanceTicketRepository,
} from '../repositories';
import { PropertyController } from '../controllers/propertyController';
import { UnitController } from '../controllers/unitController';
import { TenantController } from '../controllers/tenantController';
import { LeaseController } from '../controllers/leaseController';
import { TransactionController } from '../controllers/transactionController';
import { AuthController } from '../controllers/authController';
import { SearchController } from '../controllers/searchController';
import { ReportsController } from '../controllers/reportsController';
import { ForecastController } from '../controllers/forecastController';
import { createPropertyRouter } from './properties';
import { createUnitRouter } from './units';
import { createTenantRouter } from './tenants';
import { createLeaseRouter } from './leases';
import { createTransactionRouter } from './transactions';
import { createAuthRouter } from './auth';
import { createSearchRouter } from './search';
import { createReportsRouter } from './reports';
import { createForecastRouter } from './forecast';
import { AuthService } from '../services/authService';
import { createAuthMiddleware } from '../middleware/auth';

export function createApiRouter(prisma: PrismaClient, jwtSecret: string): Router {
  const propertyRepo = new PropertyRepository(prisma);
  const unitRepo = new UnitRepository(prisma);
  const tenantRepo = new TenantRepository(prisma);
  const leaseRepo = new LeaseRepository(prisma);
  const transactionRepo = new TransactionRepository(prisma);
  const userRepo = new UserRepository(prisma);
  const maintenanceTicketRepo = new MaintenanceTicketRepository(prisma);

  const authService = new AuthService(jwtSecret);
  const authMiddleware = createAuthMiddleware(authService);

  const propertyController = new PropertyController(propertyRepo);
  const unitController = new UnitController(unitRepo, propertyRepo);
  const tenantController = new TenantController(tenantRepo);
  const leaseController = new LeaseController(leaseRepo, unitRepo, tenantRepo);
  const transactionController = new TransactionController(
    transactionRepo,
    propertyRepo,
    unitRepo,
    leaseRepo,
  );
  const authController = new AuthController(userRepo, authService);
  const searchController = new SearchController(propertyRepo, tenantRepo, transactionRepo);
  const reportsController = new ReportsController(
    propertyRepo,
    unitRepo,
    tenantRepo,
    leaseRepo,
    transactionRepo,
    maintenanceTicketRepo,
  );
  const forecastController = new ForecastController(
    propertyRepo,
    unitRepo,
    leaseRepo,
    transactionRepo,
  );

  const router = Router();

  // Public endpoints
  router.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });
  router.use('/auth', createAuthRouter(authController, authMiddleware));

  // Everything below requires a valid JWT
  router.use(authMiddleware);
  router.use('/properties', createPropertyRouter(propertyController));
  router.use('/units', createUnitRouter(unitController));
  router.use('/tenants', createTenantRouter(tenantController));
  router.use('/leases', createLeaseRouter(leaseController));
  router.use('/transactions', createTransactionRouter(transactionController));
  router.use('/search', createSearchRouter(searchController));
  router.use('/reports', createReportsRouter(reportsController));
  router.use('/forecast', createForecastRouter(forecastController));
  return router;
}
