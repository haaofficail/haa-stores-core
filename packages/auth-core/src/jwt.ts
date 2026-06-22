import jwt from 'jsonwebtoken';
import type { JwtPayload } from '@haa/shared';

// JWT iss/aud configuration (F-QA-B-NEXT — Wave 15 P2 follow-up).
//
// Rollout strategy is INTENTIONALLY LENIENT to avoid invalidating any
// live token at the moment this lands:
//   - signToken() always embeds `iss` + `aud` going forward.
//   - verifyToken() validates `iss` + `aud` ONLY when the token has them
//     (older tokens without these claims continue to validate cleanly
//      until they expire naturally per `JWT_EXPIRES_IN`).
//   - After all live tokens have rotated (≥ JWT_EXPIRES_IN duration),
//     a separate PR can flip the verify path to strict mode by exporting
//     a `verifyTokenStrict()` and switching call sites.
//
// Configuration (env):
//   - JWT_ISSUER (default `haa-stores`) — embedded into iss; verified
//     against the `iss` claim when present.
//   - JWT_AUDIENCE (default `haa-stores-api`) — embedded into aud;
//     verified against the `aud` claim when present.

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is required');
  return secret;
}

function getExpiresIn(): string {
  return process.env.JWT_EXPIRES_IN ?? '24h';
}

function getIssuer(): string {
  return process.env.JWT_ISSUER ?? 'haa-stores';
}

function getAudience(): string {
  return process.env.JWT_AUDIENCE ?? 'haa-stores-api';
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, getSecret(), {
    expiresIn: getExpiresIn() as any,
    issuer: getIssuer(),
    audience: getAudience(),
  });
}

export function verifyToken(token: string): JwtPayload {
  // Lenient verify: validate `iss` + `aud` only when the decoded token
  // carries them. Tokens minted before this PR landed lack the claims
  // and continue to pass verification until they expire naturally.
  // After the rollout window, flip to verifyTokenStrict() in callers.
  const decoded = jwt.verify(token, getSecret(), { algorithms: ['HS256'] }) as JwtPayload & {
    iss?: string;
    aud?: string;
  };

  const expectedIssuer = getIssuer();
  const expectedAudience = getAudience();

  if (decoded.iss !== undefined && decoded.iss !== expectedIssuer) {
    throw new Error(`Invalid token issuer: expected ${expectedIssuer}, got ${decoded.iss}`);
  }
  if (decoded.aud !== undefined) {
    const audValues = Array.isArray(decoded.aud) ? decoded.aud : [decoded.aud];
    if (!audValues.includes(expectedAudience)) {
      throw new Error(`Invalid token audience: expected ${expectedAudience}`);
    }
  }

  return decoded;
}

/**
 * Strict verify — REQUIRES `iss` + `aud` to be present and match.
 * Use AFTER the lenient rollout window has expired and all live tokens
 * have been refreshed. Currently exported for explicit-opt-in callers
 * and the test suite; existing call sites continue to use the lenient
 * `verifyToken()` until a follow-up PR flips them.
 */
export function verifyTokenStrict(token: string): JwtPayload {
  return jwt.verify(token, getSecret(), {
    algorithms: ['HS256'],
    issuer: getIssuer(),
    audience: getAudience(),
  }) as JwtPayload;
}
