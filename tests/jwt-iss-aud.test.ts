// JWT issuer + audience validation — F-QA-B-NEXT / Wave 15 P2.
//
// Lenient rollout: tokens minted by signToken() must carry iss/aud claims,
// but verifyToken() must accept tokens lacking those claims (so live tokens
// minted before this lands stay valid until expiry).

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createHmac } from 'node:crypto';
import { signToken, verifyToken, verifyTokenStrict } from '../packages/auth-core/src/jwt';

const SAMPLE = {
  userId: 1,
  tenantId: 1,
  activeStoreId: 1,
  tokenVersion: 1,
  roles: ['merchant_owner'],
  permissions: ['settings:read'],
};

const TEST_SECRET = 'test-secret-jwt-iss-aud-spec';

function base64url(buf: Buffer | string): string {
  return Buffer.from(buf).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}

/**
 * Mint an HS256 JWT using only Node's crypto — avoids importing
 * jsonwebtoken from the test file (root package.json has no direct dep).
 */
function makeToken(payload: Record<string, unknown>, secret: string): string {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64url(JSON.stringify({ iat: now, exp: now + 3600, ...payload }));
  const data = `${header}.${body}`;
  const sig = createHmac('sha256', secret).update(data).digest();
  return `${data}.${base64url(sig)}`;
}

function decodePayload(token: string): Record<string, unknown> {
  const [, body] = token.split('.');
  const pad = '='.repeat((4 - (body.length % 4)) % 4);
  const json = Buffer.from(body.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64').toString('utf-8');
  return JSON.parse(json);
}

describe('JWT iss/aud (F-QA-B-NEXT / Wave 15)', () => {
  const prev = {
    JWT_SECRET: process.env.JWT_SECRET,
    JWT_ISSUER: process.env.JWT_ISSUER,
    JWT_AUDIENCE: process.env.JWT_AUDIENCE,
  };

  beforeAll(() => {
    process.env.JWT_SECRET = TEST_SECRET;
    delete process.env.JWT_ISSUER;
    delete process.env.JWT_AUDIENCE;
  });

  afterAll(() => {
    for (const [k, v] of Object.entries(prev)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  it('signToken embeds the configured iss + aud (defaults haa-stores / haa-stores-api)', () => {
    const token = signToken(SAMPLE);
    const decoded = decodePayload(token);
    expect(decoded.iss).toBe('haa-stores');
    expect(decoded.aud).toBe('haa-stores-api');
  });

  it('signToken respects JWT_ISSUER + JWT_AUDIENCE overrides', () => {
    process.env.JWT_ISSUER = 'custom-issuer';
    process.env.JWT_AUDIENCE = 'custom-audience';
    try {
      const token = signToken(SAMPLE);
      const decoded = decodePayload(token);
      expect(decoded.iss).toBe('custom-issuer');
      expect(decoded.aud).toBe('custom-audience');
    } finally {
      delete process.env.JWT_ISSUER;
      delete process.env.JWT_AUDIENCE;
    }
  });

  it('verifyToken accepts a token MINTED by signToken (matching iss+aud)', () => {
    const token = signToken(SAMPLE);
    const decoded = verifyToken(token);
    expect(decoded.userId).toBe(1);
  });

  it('verifyToken (lenient) accepts a legacy token WITHOUT iss/aud claims', () => {
    const legacy = makeToken(SAMPLE, TEST_SECRET);
    const decoded = verifyToken(legacy);
    expect(decoded.userId).toBe(1);
  });

  it('verifyToken REJECTS a token with wrong issuer', () => {
    const bad = makeToken({ ...SAMPLE, iss: 'attacker', aud: 'haa-stores-api' }, TEST_SECRET);
    expect(() => verifyToken(bad)).toThrow(/Invalid token issuer/);
  });

  it('verifyToken REJECTS a token with wrong audience', () => {
    const bad = makeToken({ ...SAMPLE, iss: 'haa-stores', aud: 'wrong-audience' }, TEST_SECRET);
    expect(() => verifyToken(bad)).toThrow(/Invalid token audience/);
  });

  it('verifyTokenStrict REJECTS a legacy token without iss/aud', () => {
    const legacy = makeToken(SAMPLE, TEST_SECRET);
    expect(() => verifyTokenStrict(legacy)).toThrow();
  });

  it('verifyTokenStrict accepts a fresh signToken-issued token', () => {
    const token = signToken(SAMPLE);
    const decoded = verifyTokenStrict(token);
    expect(decoded.userId).toBe(1);
  });
});
