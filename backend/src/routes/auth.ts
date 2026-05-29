import { Router, RequestHandler } from 'express';
import { AuthController } from '../controllers/authController';
import { authRateLimiter } from '../middleware/rateLimiter';

export function createAuthRouter(
  controller: AuthController,
  authMiddleware: RequestHandler,
): Router {
  const router = Router();
  router.post('/register', authRateLimiter, controller.register);
  router.post('/login', authRateLimiter, controller.login);
  router.get('/me', authMiddleware, controller.me);
  return router;
}
