import bcrypt from 'bcrypt';
import jwt, { type SignOptions } from 'jsonwebtoken';

const BCRYPT_COST = 12;
const TOKEN_EXPIRY = '24h';

export interface AuthTokenPayload {
  sub: string;
  email: string;
}

export class AuthService {
  private readonly jwtSecret: string;

  public constructor(jwtSecret: string) {
    if (!jwtSecret || jwtSecret.length < 16) {
      throw new Error('JWT_SECRET must be set and at least 16 characters');
    }
    this.jwtSecret = jwtSecret;
  }

  public hashPassword(plaintext: string): Promise<string> {
    return bcrypt.hash(plaintext, BCRYPT_COST);
  }

  public verifyPassword(plaintext: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plaintext, hash);
  }

  public signToken(payload: AuthTokenPayload): string {
    const options: SignOptions = { expiresIn: TOKEN_EXPIRY };
    return jwt.sign(payload, this.jwtSecret, options);
  }

  public verifyToken(token: string): AuthTokenPayload {
    const decoded = jwt.verify(token, this.jwtSecret);
    if (typeof decoded !== 'object' || decoded === null) {
      throw new Error('Invalid token payload');
    }
    const { sub, email } = decoded as Record<string, unknown>;
    if (typeof sub !== 'string' || typeof email !== 'string') {
      throw new Error('Invalid token payload');
    }
    return { sub, email };
  }
}
