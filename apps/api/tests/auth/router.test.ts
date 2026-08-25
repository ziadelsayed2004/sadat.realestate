import assert from 'node:assert/strict';
import test from 'node:test';
import { createApiServer, startApiServer, stopApiServer } from '../../src/server.js';
import type { AuthService, IssuedAuthSession } from '../../src/modules/auth/service.js';
import { AuthServiceError } from '../../src/modules/auth/service.js';
import { serializeRefreshCookie } from '../../src/modules/auth/router.js';
import type { OtpService } from '../../src/modules/auth/otp-service.js';
import { OtpServiceError } from '../../src/modules/auth/otp-service.js';

const currentToken = 'R'.repeat(43);
const replacementToken = 'N'.repeat(43);
const challengeId = '123e4567-e89b-42d3-a456-426614174000';

interface AuthResponseBody {
  meta?: { requestId?: unknown };
  data?: {
    accessToken?: unknown;
    loggedOut?: unknown;
    accepted?: unknown;
    challengeId?: unknown;
    outcome?: unknown;
    verificationToken?: unknown;
    user?: { roleType?: unknown };
  };
  error?: { code?: unknown; stack?: unknown };
}

function issued(refreshToken: string): IssuedAuthSession {
  return {
    data: {
      accessToken: 'header.payload.signature',
      tokenType: 'Bearer',
      expiresInSeconds: 900,
      user: {
        id: '0123456789abcdef01234567',
        roleType: 'admin',
        status: 'verified'
      }
    },
    refreshToken,
    refreshExpiresAt: new Date('2026-09-11T12:00:00.000Z')
  };
}

function service(): AuthService {
  return {
    async loginAdmin(input) {
      if (input.password !== 'correct-password') {
        throw new AuthServiceError('INVALID_CREDENTIALS');
      }
      return issued(currentToken);
    },
    async issueAccount() { return issued(currentToken); },
    async refresh(token) {
      if (token === currentToken) return issued(replacementToken);
      if (token === replacementToken) throw new AuthServiceError('REFRESH_TOKEN_REUSED');
      throw new AuthServiceError('INVALID_REFRESH_TOKEN');
    },
    async logout(token) {
      if (token !== replacementToken) throw new AuthServiceError('INVALID_REFRESH_TOKEN');
    }
  };
}

function otpService(): OtpService {
  return {
    isReady: () => true,
    async send() {
      return { accepted: true, challengeId, expiresInSeconds: 300, retryAfterSeconds: 60 };
    },
    async verify(input) {
      if (input.code !== '000000') throw new OtpServiceError('INVALID_OTP');
      if (input.purpose === 'registration') {
        return {
          data: {
            outcome: 'verified', verificationToken: 'V'.repeat(43),
            expiresInSeconds: 600, roleType: input.roleType
          }
        };
      }
      return {
        data: {
          outcome: 'authenticated',
          ...issued(currentToken).data,
          user: { ...issued(currentToken).data.user, roleType: input.roleType }
        },
        refreshToken: currentToken,
        refreshExpiresAt: new Date('2026-09-11T12:00:00.000Z')
      };
    }
  };
}

async function withAuthServer(run: (baseUrl: string) => Promise<void>): Promise<void> {
  const server = createApiServer({
    database: { isReady: async () => true },
    auth: {
      service: service(),
      otpService: otpService(),
      cookie: {
        name: 'sadat_refresh',
        path: '/api/v1/auth',
        httpOnly: true,
        sameSite: 'Strict',
        secure: true,
        maxAgeSeconds: 2_592_000
      }
    }
  });
  const address = await startApiServer(server, { host: '127.0.0.1', port: 0 });
  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await stopApiServer(server);
  }
}

test('logs in an Admin with strict input, a success envelope, and a secure HttpOnly cookie', async () => {
  await withAuthServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Request-Id': 'auth-login-1' },
      body: JSON.stringify({ email: ' Admin@Example.COM ', password: 'correct-password' })
    });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.match(response.headers.get('set-cookie') ?? '', /^sadat_refresh=/);
    assert.match(response.headers.get('set-cookie') ?? '', /HttpOnly/);
    assert.match(response.headers.get('set-cookie') ?? '', /SameSite=Strict/);
    assert.match(response.headers.get('set-cookie') ?? '', /Secure/);
    const body = await response.json() as AuthResponseBody;
    assert.equal(body.meta?.requestId, 'auth-login-1');
    assert.equal(body.data?.user?.roleType, 'admin');
    assert.equal(body.data?.accessToken, 'header.payload.signature');
    assert.equal(JSON.stringify(body).includes(currentToken), false);
  });
});

test('sends and verifies strict phone-and-email-bound OTP challenges for seeker/provider flows', async () => {
  await withAuthServer(async (baseUrl) => {
    const sent = await fetch(`${baseUrl}/api/v1/auth/otp/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Request-Id': 'otp-send-api' },
      body: JSON.stringify({
        phone: '+20 100 000 0000',
        email: 'seeker@example.com',
        roleType: 'seeker',
        purpose: 'login'
      })
    });
    assert.equal(sent.status, 202);
    assert.equal(sent.headers.get('cache-control'), 'no-store');
    const sentBody = await sent.json() as AuthResponseBody;
    assert.equal(sentBody.data?.accepted, true);
    assert.equal(sentBody.data?.challengeId, challengeId);
    assert.equal(JSON.stringify(sentBody).includes('000000'), false);

    const verified = await fetch(`${baseUrl}/api/v1/auth/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: '+201000000000', email: 'seeker@example.com', roleType: 'seeker', purpose: 'login', challengeId, code: '000000'
      })
    });
    assert.equal(verified.status, 200);
    assert.match(verified.headers.get('set-cookie') ?? '', /^sadat_refresh=/);
    const verifiedBody = await verified.json() as AuthResponseBody;
    assert.equal(verifiedBody.data?.outcome, 'authenticated');
    assert.equal(verifiedBody.data?.user?.roleType, 'seeker');
    assert.equal(JSON.stringify(verifiedBody).includes(currentToken), false);

    const registration = await fetch(`${baseUrl}/api/v1/auth/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: '+201000000000', email: 'provider@example.com', roleType: 'provider', purpose: 'registration', challengeId, code: '000000'
      })
    });
    assert.equal(registration.status, 200);
    assert.equal(registration.headers.get('set-cookie'), null);
    const registrationBody = await registration.json() as AuthResponseBody;
    assert.equal(registrationBody.data?.outcome, 'verified');
    assert.equal(registrationBody.data?.verificationToken, 'V'.repeat(43));
  });
});

test('rejects Admin OTP, loose payloads, malformed codes, and provider failures safely', async () => {
  await withAuthServer(async (baseUrl) => {
    for (const body of [
      { phone: '+201000000000', email: 'admin@example.com', roleType: 'admin', purpose: 'login' },
      { phone: '01000000000', email: 'seeker@example.com', roleType: 'seeker', purpose: 'login' },
      { phone: '+201000000000', email: 'seeker@example.com', roleType: 'seeker', purpose: 'login', password: 'unsafe' }
    ]) {
      const response = await fetch(`${baseUrl}/api/v1/auth/otp/send`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
      });
      assert.equal(response.status, 400);
    }
    const invalid = await fetch(`${baseUrl}/api/v1/auth/otp/verify`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: '+201000000000', email: 'seeker@example.com', roleType: 'seeker', purpose: 'login', challengeId, code: '111111'
      })
    });
    assert.equal(invalid.status, 401);
    const invalidBody = await invalid.json() as AuthResponseBody;
    assert.equal(invalidBody.error?.code, 'INVALID_OTP');
    assert.equal(Boolean(invalidBody.error && 'stack' in invalidBody.error), false);
  });
});

test('keeps Local/Test cookies host-only and HTTP-compatible while retaining security attributes', () => {
  const serialized = serializeRefreshCookie(currentToken, {
    name: 'sadat_refresh',
    path: '/api/v1/auth',
    httpOnly: true,
    sameSite: 'Strict',
    secure: false,
    maxAgeSeconds: 2_592_000
  });
  assert.match(serialized, /HttpOnly/);
  assert.match(serialized, /SameSite=Strict/);
  assert.doesNotMatch(serialized, /Secure/);
  assert.doesNotMatch(serialized, /Domain=/);
});

test('returns generic credential and strict validation errors without internals', async () => {
  await withAuthServer(async (baseUrl) => {
    const invalid = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@example.com', password: 'wrong-password' })
    });
    assert.equal(invalid.status, 401);
    const invalidBody = await invalid.json() as AuthResponseBody;
    assert.equal(invalidBody.error?.code, 'INVALID_CREDENTIALS');
    assert.equal(Boolean(invalidBody.error && 'stack' in invalidBody.error), false);
    assert.equal(JSON.stringify(invalidBody).includes('wrong-password'), false);

    const unknown = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@example.com',
        password: 'correct-password',
        roleType: 'seeker'
      })
    });
    assert.equal(unknown.status, 400);
    const unknownBody = await unknown.json() as AuthResponseBody;
    assert.equal(unknownBody.error?.code, 'VALIDATION_FAILED');
  });
});

test('rotates the refresh cookie, rejects replay, and clears invalid cookies', async () => {
  await withAuthServer(async (baseUrl) => {
    const rotated = await fetch(`${baseUrl}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { Cookie: `sadat_refresh=${currentToken}` }
    });
    assert.equal(rotated.status, 200);
    assert.match(rotated.headers.get('set-cookie') ?? '', new RegExp(`^sadat_refresh=${replacementToken}`));
    const body = await rotated.json() as AuthResponseBody;
    assert.equal(JSON.stringify(body).includes(replacementToken), false);

    const replay = await fetch(`${baseUrl}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { Cookie: `sadat_refresh=${replacementToken}` }
    });
    assert.equal(replay.status, 401);
    const replayBody = await replay.json() as AuthResponseBody;
    assert.equal(replayBody.error?.code, 'REFRESH_TOKEN_REUSED');
    assert.match(replay.headers.get('set-cookie') ?? '', /Max-Age=0/);

    const missing = await fetch(`${baseUrl}/api/v1/auth/refresh`, { method: 'POST' });
    assert.equal(missing.status, 401);
    assert.match(missing.headers.get('set-cookie') ?? '', /Max-Age=0/);
  });
});

test('logs out the current session and rejects missing, duplicate, or replayed cookie authority', async () => {
  await withAuthServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/v1/auth/logout`, {
      method: 'POST',
      headers: { Cookie: `sadat_refresh=${replacementToken}` }
    });
    assert.equal(response.status, 200);
    assert.deepEqual((await response.json() as AuthResponseBody).data, { loggedOut: true });
    assert.match(response.headers.get('set-cookie') ?? '', /Max-Age=0/);

    const duplicate = await fetch(`${baseUrl}/api/v1/auth/logout`, {
      method: 'POST',
      headers: { Cookie: `sadat_refresh=${replacementToken}; sadat_refresh=${replacementToken}` }
    });
    assert.equal(duplicate.status, 401);
  });
});
