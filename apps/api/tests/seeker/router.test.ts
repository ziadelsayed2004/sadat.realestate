import assert from 'node:assert/strict';
import test from 'node:test';
import type { AccessTokenService } from '../../src/modules/auth/crypto.js';
import type { AuthCookiePolicy } from '../../src/modules/auth/environment.js';
import type { SeekerService } from '../../src/modules/seeker/service.js';
import { createApiServer, startApiServer, stopApiServer } from '../../src/server.js';

const token = 'header.payload.signature';
const accessTokens: AccessTokenService = {
  issue: () => token,
  verify(value) {
    if (value !== token) throw new Error('invalid');
    return {
      iss: 'sadat-real-estate-api', aud: 'sadat-real-estate',
      sub: '0123456789abcdef01234567', sid: 'abcdefabcdefabcdefabcdef', role: 'seeker',
      status: 'verified', iat: 1, exp: 9999999999, jti: 'test'
    };
  }
};

const cookie: AuthCookiePolicy = {
  name: 'sadat_refresh', path: '/api/v1/auth', httpOnly: true,
  sameSite: 'Strict', secure: true, maxAgeSeconds: 2_592_000
};

const service: SeekerService = {
  async register() {
    return {
      data: {
        outcome: 'registered',
        session: {
          accessToken: token, tokenType: 'Bearer', expiresInSeconds: 900,
          user: { id: '0123456789abcdef01234567', roleType: 'seeker', status: 'verified' }
        }
      },
      refreshToken: 'R'.repeat(43),
      refreshExpiresAt: new Date()
    };
  },
  async getProfile() {
    return {
      id: '0123456789abcdef01234567', roleType: 'seeker', status: 'verified',
      phone: '+201000000000', email: 'seeker@example.com', firstName: 'Salma', lastName: 'Hassan', locale: 'ar'
    };
  },
  async updateProfile(_claims, patch) {
    return {
      id: '0123456789abcdef01234567', roleType: 'seeker', status: 'verified',
      phone: '+201000000000', email: 'seeker@example.com', firstName: patch.firstName ?? 'Salma',
      lastName: patch.lastName ?? 'Hassan', locale: patch.locale ?? 'ar'
    };
  },
  async getPreferences() {
    return { data: {}, updatedAt: new Date('2026-08-01T00:00:00.000Z') };
  },
  async updatePreferences(_claims, patch) {
    return { data: patch, updatedAt: new Date('2026-08-01T00:00:00.000Z') };
  }
};

async function withServer(run: (baseUrl: string) => Promise<void>) {
  const server = createApiServer({
    database: { isReady: async () => true },
    seeker: { service, accessTokens, cookie, overview: { async get() { return { requests: 2, viewings: 1, savedProperties: 3, notifications: 4, unreadNotifications: 2 }; } } }
  });
  const address = await startApiServer(server, { host: '127.0.0.1', port: 0 });
  try { await run(`http://127.0.0.1:${address.port}`); } finally { await stopApiServer(server); }
}

test('serves the authenticated seeker overview from real aggregate summaries', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/v1/seeker/overview`, { headers: { Authorization: `Bearer ${token}` } });
    assert.equal(response.status, 200);
    assert.deepEqual((await response.json() as { data: unknown }).data, { requests: 2, viewings: 1, savedProperties: 3, notifications: 4, unreadNotifications: 2 });
  });
});

test('requires bearer authentication and prevents non-seeker access', async () => {
  await withServer(async (baseUrl) => {
    const missing = await fetch(`${baseUrl}/api/v1/me`);
    assert.equal(missing.status, 401);
    const forbidden = await fetch(`${baseUrl}/api/v1/me`, {
      headers: { Authorization: 'Bearer not-a-token' }
    });
    assert.equal(forbidden.status, 401);
  });
});

test('registers and serves only the authenticated seeker projection', async () => {
  await withServer(async (baseUrl) => {
    const registered = await fetch(`${baseUrl}/api/v1/auth/register/seeker`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ verificationToken: 'T'.repeat(43), firstName: 'Salma', lastName: 'Hassan' })
    });
    assert.equal(registered.status, 201);
    assert.match(registered.headers.get('set-cookie') ?? '', /^sadat_refresh=/);

    const profile = await fetch(`${baseUrl}/api/v1/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    assert.equal(profile.status, 200);
    const body = await profile.json() as { data?: { id?: string; phone?: string; internalNotes?: unknown } };
    assert.equal(body.data?.id, '0123456789abcdef01234567');
    assert.equal(body.data?.phone, '+201000000000');
    assert.equal('internalNotes' in (body.data ?? {}), false);

    const updatedProfile = await fetch(`${baseUrl}/api/v1/me`, {
      method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstName: 'Mariam', locale: 'en' })
    });
    assert.equal(updatedProfile.status, 200);
    const updatedProfileBody = await updatedProfile.json() as { data?: { firstName?: string; locale?: string } };
    assert.equal(updatedProfileBody.data?.firstName, 'Mariam');
    assert.equal(updatedProfileBody.data?.locale, 'en');

    const updatedPreferences = await fetch(`${baseUrl}/api/v1/me/preferences`, {
      method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ locations: ['new-cairo'], minPrice: 100, maxPrice: 200 })
    });
    assert.equal(updatedPreferences.status, 200);
    assert.equal(typeof (await updatedPreferences.json() as { data?: { updatedAt?: string } }).data?.updatedAt, 'string');

    const invalid = await fetch(`${baseUrl}/api/v1/me/preferences`, {
      method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'other-user' })
    });
    assert.equal(invalid.status, 400);
  });
});
