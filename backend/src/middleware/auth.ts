import { NextFunction, Request, Response } from 'express';
import { AuthService } from '../services/authService';
import { HttpError } from '../errors';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
      };
    }
  }
}

export function createAuthMiddleware(authService: AuthService) {
  return function authMiddleware(req: Request, _res: Response, next: NextFunction): void {
    const header = req.headers.authorization;
    if (!header || !header.toLowerCase().startsWith('bearer ')) {
      return next(new HttpError(401, 'Missing or malformed Authorization header'));
    }

    const token = header.slice(7).trim();
    if (!token) {
      return next(new HttpError(401, 'Missing bearer token'));
    }

    try {
      const payload = authService.verifyToken(token);
      req.user = { id: payload.sub, email: payload.email };
      next();
    } catch {
      next(new HttpError(401, 'Invalid or expired token'));
    }
  };
}
