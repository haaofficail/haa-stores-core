import jwt from 'jsonwebtoken';
import type { JwtPayload } from '@haa/shared';

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is required');
  return secret;
}

function getExpiresIn(): string {
  return process.env.JWT_EXPIRES_IN ?? '24h';
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, getSecret(), { expiresIn: getExpiresIn() as any });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, getSecret(), { algorithms: ['HS256'] }) as JwtPayload;
}
