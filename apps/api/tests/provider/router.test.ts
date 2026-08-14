import assert from 'node:assert/strict';
import test from 'node:test';
import type { AccessTokenService } from '../../src/modules/auth/crypto.js';
import type { AuthCookiePolicy } from '../../src/modules/auth/environment.js';
import type { ProviderApplicationData } from '@sadat-real-estate/contracts';
import type { ProviderService } from '../../src/modules/provider/service.js';
import { createApiServer, startApiServer, stopApiServer } from '../../src/server.js';

const providerToken = 'provider.header.signature';
const seekerToken = 'seeker.header.signature';
const accessTokens: AccessTokenService = {
  issue: () => providerToken,
  verify(value) {
    if (value !== providerToken && value !== seekerToken) throw new Error('invalid');
    return {
      iss: 'sadat-real-estate-api', aud: 'sadat-real-estate',
      sub: '0123456789abcdef01234567', sid: 'abcdefabcdefabcdefabcdef',
      role: value === providerToken ? 'provider' : 'seeker', status: 'draft',
      iat: 1, exp: 9_999_999_999, jti: 'test'
    };
  }
};

const cookie: AuthCookiePolicy = {
  name: 'sadat_refresh', path: '/api/v1/auth', httpOnly: true,
  sameSite: 'Strict', secure: true, maxAgeSeconds: 2_592_000
};

function application(overrides: Partial<ProviderApplicationData> = {}): ProviderApplicationData {
  return {
    id: 'abcdefabcdefabcdefabcdef',
    providerType: 'individual_broker',
    status: 'draft',
    version: 0,
    phone: '+201000000000',
    requirementVersion: '2026-08-13.1',
    missingFields: ['accountOwnerFullName'],
    missingDocuments: ['government_id_front', 'government_id_back'],
    availableActions: ['edit_account', 'submit', 'view_status'],
    createdAt: '2026-08-13T00:00:00.000Z',
    updatedAt: '2026-08-13T00:00:00.000Z',
    ...overrides
  };
}

const service: ProviderService = {
  async registerDraft(input) {
    return {
      data: {
        outcome: 'registered_draft',
        session: {
          accessToken: providerToken, tokenType: 'Bearer', expiresInSeconds: 900,
          user: { id: '0123456789abcdef01234567', roleType: 'provider', status: 'draft' }
        },
        application: application({ providerType: input.providerType })
      },
      refreshToken: 'R'.repeat(43),
      refreshExpiresAt: new Date('2026-09-13T00:00:00.000Z')
    };
  },
  async getApplication() { return application(); },
  async updateAccount(_claims, patch) {
    return application({ version: patch.version + 1, displayName: patch.displayName });
  },
  async updateBusiness(_claims, patch) {
    return application({ providerType: 'brokerage_office', version: patch.version + 1 });
  },
  async updateCompany(_claims, patch) {
    return application({ providerType: 'developer_company', version: patch.version + 1 });
  },
  async submit(_claims, input) {
    return application({ status: 'pending_review', version: input.version + 1, availableActions: ['view_status'] });
  },
  async getStatus() {
    return {
      applicationId: 'abcdefabcdefabcdefabcdef',
      providerType: 'individual_broker',
      status: 'draft',
      version: 0,
      availableActions: ['edit_account', 'submit', 'view_status']
    };
  }
};

async function withServer(run: (baseUrl: string) => Promise<void>) {
  const server = createApiServer({
    database: { isReady: async () => true },
    provider: { service, accessTokens, cookie }
  });
  const address = await startApiServer(server, { host: '127.0.0.1', port: 0 });
  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await stopApiServer(server);
  }
}

test('registers a provider draft through verified authority without accepting extra fields', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/v1/provider/application`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        verificationToken: 'T'.repeat(43), providerType: 'individual_broker'
      })
    });
    assert.equal(response.status, 201);
    assert.match(response.headers.get('set-cookie') ?? '', /^sadat_refresh=/);
    const body = await response.json() as { data?: { application?: { status?: string } } };
    assert.equal(body.data?.application?.status, 'draft');

    const invalid = await fetch(`${baseUrl}/api/v1/provider/application`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        verificationToken: 'T'.repeat(43), providerType: 'office'
      })
    });
    assert.equal(invalid.status, 400);
  });
});

test('requires provider bearer authority and rejects other roles', async () => {
  await withServer(async (baseUrl) => {
    const missing = await fetch(`${baseUrl}/api/v1/provider/application`);
    assert.equal(missing.status, 401);
    const forbidden = await fetch(`${baseUrl}/api/v1/provider/application`, {
      headers: { Authorization: `Bearer ${seekerToken}` }
    });
    assert.equal(forbidden.status, 403);
    const allowed = await fetch(`${baseUrl}/api/v1/provider/application`, {
      headers: { Authorization: `Bearer ${providerToken}` }
    });
    assert.equal(allowed.status, 200);
    const body = await allowed.json() as { data?: Record<string, unknown> };
    assert.equal('internalNotes' in (body.data ?? {}), false);
    assert.equal('documents' in (body.data ?? {}), false);
  });
});

test('validates allowlisted patches, submit versions, and status tracking', async () => {
  await withServer(async (baseUrl) => {
    const invalidPatch = await fetch(`${baseUrl}/api/v1/provider/application/account`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${providerToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ version: 0, userId: '999999999999999999999999' })
    });
    assert.equal(invalidPatch.status, 400);

    const patch = await fetch(`${baseUrl}/api/v1/provider/application/account`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${providerToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ version: 0, displayName: 'Provider Name' })
    });
    assert.equal(patch.status, 200);

    const submit = await fetch(`${baseUrl}/api/v1/provider/application/submit`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${providerToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ version: 1 })
    });
    assert.equal(submit.status, 200);

    const status = await fetch(`${baseUrl}/api/v1/provider/application/status`, {
      headers: { Authorization: `Bearer ${providerToken}` }
    });
    assert.equal(status.status, 200);
  });
});
