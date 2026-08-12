import {
  createHash,
  createHmac,
  randomBytes,
  randomUUID,
  timingSafeEqual
} from 'node:crypto';
import { argon2id, hash as argon2Hash, verify as argon2Verify } from 'argon2';
import type { AuthAccountState, AuthRoleType } from '@sadat-real-estate/contracts';

const ACCESS_TOKEN_ISSUER = 'sadat-real-estate-api';
const ACCESS_TOKEN_AUDIENCE = 'sadat-real-estate';
const OPAQUE_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export interface PasswordHasher {
  hash(password: string): Promise<string>;
  verify(passwordHash: string, password: string): Promise<boolean>;
}

export interface AccessTokenSubject {
  id: string;
  roleType: AuthRoleType;
  status: AuthAccountState;
}

export interface AccessTokenClaims {
  iss: typeof ACCESS_TOKEN_ISSUER;
  aud: typeof ACCESS_TOKEN_AUDIENCE;
  sub: string;
  sid: string;
  role: AuthRoleType;
  status: AuthAccountState;
  iat: number;
  exp: number;
  jti: string;
}

export interface AccessTokenService {
  issue(subject: AccessTokenSubject, sessionId: string, now: Date): string;
  verify(token: string, now?: Date): AccessTokenClaims;
}

export interface OpaqueTokenService {
  create(): string;
  hash(token: string): string;
  isValid(token: string): boolean;
}

export interface OtpCodeContext {
  phone: string;
  roleType: 'seeker' | 'provider';
  purpose: 'login' | 'registration';
}

export interface OtpCodeHasher {
  hash(context: OtpCodeContext, code: string): string;
  matches(context: OtpCodeContext, code: string, storedHash: string): boolean;
}

export class AccessTokenValidationError extends Error {
  constructor() {
    super('Access token is invalid');
    this.name = 'AccessTokenValidationError';
  }
}

export function createArgon2PasswordHasher(): PasswordHasher {
  return {
    hash(password) {
      return argon2Hash(password, {
        type: argon2id,
        memoryCost: 19_456,
        timeCost: 2,
        parallelism: 1,
        hashLength: 32
      });
    },
    async verify(passwordHash, password) {
      try {
        return await argon2Verify(passwordHash, password);
      } catch {
        return false;
      }
    }
  };
}

function encodeJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
}

function signature(input: string, secret: Uint8Array): Buffer {
  return createHmac('sha256', secret).update(input).digest();
}

function isAuthRoleType(value: unknown): value is AuthRoleType {
  return value === 'seeker' || value === 'provider' || value === 'admin';
}

function isAuthAccountState(value: unknown): value is AuthAccountState {
  return typeof value === 'string' && [
    'draft',
    'unverified',
    'pending_review',
    'needs_information',
    'verified',
    'rejected',
    'restricted',
    'suspended'
  ].includes(value);
}

function parseClaims(encoded: string): AccessTokenClaims {
  try {
    const value = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as Record<string, unknown>;
    if (
      value.iss !== ACCESS_TOKEN_ISSUER ||
      value.aud !== ACCESS_TOKEN_AUDIENCE ||
      typeof value.sub !== 'string' || !/^[a-f0-9]{24}$/.test(value.sub) ||
      typeof value.sid !== 'string' || !/^[a-f0-9]{24}$/.test(value.sid) ||
      !isAuthRoleType(value.role) ||
      !isAuthAccountState(value.status) ||
      typeof value.iat !== 'number' || !Number.isSafeInteger(value.iat) ||
      typeof value.exp !== 'number' || !Number.isSafeInteger(value.exp) ||
      typeof value.jti !== 'string' || value.jti.length < 1
    ) throw new AccessTokenValidationError();
    return value as unknown as AccessTokenClaims;
  } catch (error) {
    if (error instanceof AccessTokenValidationError) throw error;
    throw new AccessTokenValidationError();
  }
}

export function createHmacAccessTokenService(
  secret: Uint8Array,
  ttlSeconds: number,
  createJti: () => string = randomUUID
): AccessTokenService {
  if (secret.byteLength < 32 || !Number.isSafeInteger(ttlSeconds) || ttlSeconds < 1) {
    throw new Error('Access token configuration is invalid');
  }
  const key = new Uint8Array(secret);
  return {
    issue(subject, sessionId, now) {
      const issuedAt = Math.floor(now.getTime() / 1000);
      const header = encodeJson({ alg: 'HS256', typ: 'JWT' });
      const claims: AccessTokenClaims = {
        iss: ACCESS_TOKEN_ISSUER,
        aud: ACCESS_TOKEN_AUDIENCE,
        sub: subject.id,
        sid: sessionId,
        role: subject.roleType,
        status: subject.status,
        iat: issuedAt,
        exp: issuedAt + ttlSeconds,
        jti: createJti()
      };
      const payload = encodeJson(claims);
      const unsigned = `${header}.${payload}`;
      return `${unsigned}.${signature(unsigned, key).toString('base64url')}`;
    },
    verify(token, now = new Date()) {
      const segments = token.split('.');
      if (segments.length !== 3) throw new AccessTokenValidationError();
      const [header, payload, encodedSignature] = segments;
      if (!header || !payload || !encodedSignature) throw new AccessTokenValidationError();
      try {
        const parsedHeader = JSON.parse(Buffer.from(header, 'base64url').toString('utf8')) as Record<string, unknown>;
        if (parsedHeader.alg !== 'HS256' || parsedHeader.typ !== 'JWT') throw new AccessTokenValidationError();
        const supplied = Buffer.from(encodedSignature, 'base64url');
        const expected = signature(`${header}.${payload}`, key);
        if (supplied.byteLength !== expected.byteLength || !timingSafeEqual(supplied, expected)) {
          throw new AccessTokenValidationError();
        }
        const claims = parseClaims(payload);
        const nowSeconds = Math.floor(now.getTime() / 1000);
        if (claims.exp <= nowSeconds || claims.iat > nowSeconds + 60 || claims.exp <= claims.iat) {
          throw new AccessTokenValidationError();
        }
        return claims;
      } catch (error) {
        if (error instanceof AccessTokenValidationError) throw error;
        throw new AccessTokenValidationError();
      }
    }
  };
}

export function createOpaqueTokenService(
  generate: () => Buffer = () => randomBytes(32)
): OpaqueTokenService {
  return {
    create() {
      const value = generate().toString('base64url');
      if (!OPAQUE_TOKEN_PATTERN.test(value)) throw new Error('Opaque token generator returned an invalid value');
      return value;
    },
    hash(token) {
      if (!OPAQUE_TOKEN_PATTERN.test(token)) throw new Error('Opaque token is invalid');
      return createHash('sha256').update(token, 'utf8').digest('base64url');
    },
    isValid(token) {
      return OPAQUE_TOKEN_PATTERN.test(token);
    }
  };
}

export function createHmacOtpCodeHasher(secret: Uint8Array): OtpCodeHasher {
  if (secret.byteLength < 32) throw new Error('OTP hash configuration is invalid');
  const key = createHmac('sha256', new Uint8Array(secret))
    .update('sadat-real-estate:otp-code:v1', 'utf8')
    .digest();

  function digest(context: OtpCodeContext, code: string): Buffer {
    return createHmac('sha256', key)
      .update(`${context.roleType}\u0000${context.purpose}\u0000${context.phone}\u0000${code}`, 'utf8')
      .digest();
  }

  return Object.freeze({
    hash(context: OtpCodeContext, code: string) {
      if (!/^\d{6}$/.test(code)) throw new Error('OTP code is invalid');
      return digest(context, code).toString('base64url');
    },
    matches(context: OtpCodeContext, code: string, storedHash: string) {
      if (!/^\d{6}$/.test(code) || !OPAQUE_TOKEN_PATTERN.test(storedHash)) return false;
      const supplied = digest(context, code);
      const expected = Buffer.from(storedHash, 'base64url');
      return supplied.byteLength === expected.byteLength && timingSafeEqual(supplied, expected);
    }
  });
}
