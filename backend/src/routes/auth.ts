import { Router, RequestHandler } from 'express';
import { AuthController } from '../controllers/authController';

export function createAuthRouter(
  controller: AuthController,
  authMiddleware: RequestHandler,
): Router {
  const router = Router();
  router.post('/register', controller.register);
  router.post('/login', controller.login);
  router.get('/me', authMiddleware, controller.me);
  return router;
}
