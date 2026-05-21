import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { UserRepository, UserRecord } from '../repositories';
import { AuthService } from '../services/authService';
import { ConflictError, HttpError } from '../errors';
import { loginSchema, registerSchema } from '../schemas';

function serializeUser(user: UserRecord) {
  return {
    id: user.id,
    email: user.email,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export class AuthController {
  public constructor(
    private readonly users: UserRepository,
    private readonly auth: AuthService,
  ) {}

  public register = async (req: Request, res: Response): Promise<void> => {
    const body = registerSchema.parse(req.body);
    const passwordHash = await this.auth.hashPassword(body.password);
    try {
      const user = await this.users.create({
        email: body.email.toLowerCase(),
        passwordHash,
      });
      const token = this.auth.signToken({ sub: user.id, email: user.email });
      res.status(201).json({ token, user: serializeUser(user) });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictError('An account with this email already exists');
      }
      throw err;
    }
  };

  public login = async (req: Request, res: Response): Promise<void> => {
    const body = loginSchema.parse(req.body);
    const user = await this.users.findByEmail(body.email.toLowerCase());
    if (!user) {
      throw new HttpError(401, 'Invalid credentials');
    }
    const ok = await this.auth.verifyPassword(body.password, user.passwordHash);
    if (!ok) {
      throw new HttpError(401, 'Invalid credentials');
    }
    const token = this.auth.signToken({ sub: user.id, email: user.email });
    res.json({ token, user: serializeUser(user) });
  };

  public me = async (req: Request, res: Response): Promise<void> => {
    // req.user is guaranteed by authMiddleware.
    const user = await this.users.findById(req.user!.id);
    if (!user) {
      throw new HttpError(401, 'Authenticated user not found');
    }
    res.json(serializeUser(user));
  };
}
