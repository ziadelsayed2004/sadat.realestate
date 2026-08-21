import assert from 'node:assert/strict';
import test from 'node:test';
import type { AccessTokenService } from '../../src/modules/auth/crypto.js';
import type { AuthCookiePolicy } from '../../src/modules/auth/environment.js';
import {
  adQuoteSchema,
  adRequestCreateSchema,
  adRequestSchema,
  type CommissionResolution,
  type ProviderApplicationData
} from '@sadat-real-estate/contracts';
import type { ProviderService } from '../../src/modules/provider/service.js';
import {
  createProviderAdvertisingProjectionService,
  type ProviderAdvertisingRequestRecord
} from '../../src/modules/provider/advertising.js';
import { createProviderCommissionProjectionService } from '../../src/modules/provider/commission.js';
import { createApiServer, startApiServer, stopApiServer } from '../../src/server.js';

const providerToken = 'provider.header.signature';
const seekerToken = 'seeker.header.signature';
const adminToken = 'admin.header.signature';
const accessTokens: AccessTokenService = {
  issue: () => providerToken,
  verify(value) {
    if (value !== providerToken && value !== seekerToken && value !== adminToken) throw new Error('invalid');
    return {
      iss: 'sadat-real-estate-api', aud: 'sadat-real-estate',
      sub: value === adminToken ? '1123456789abcdef01234567' : '0123456789abcdef01234567', sid: 'abcdefabcdefabcdefabcdef',
      role: value === providerToken ? 'provider' : value === adminToken ? 'admin' : 'seeker', status: value === seekerToken ? 'draft' : 'verified',
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

const providerAdvertisingRecord: ProviderAdvertisingRequestRecord = {
  request: {
    id: 'abcdefabcdefabcdefabcdef',
    providerId: '0123456789abcdef01234567',
    placementKey: 'homepage.hero',
    purpose: 'Promote the provider listing',
    intervalStart: '2026-09-01T09:00:00.000Z',
    intervalEnd: '2026-09-02T09:00:00.000Z',
    status: 'draft',
    version: 0,
    createdAt: '2026-08-13T00:00:00.000Z',
    updatedAt: '2026-08-13T00:00:00.000Z'
  },
  paymentProofs: []
};

const advertisingProjection = createProviderAdvertisingProjectionService({
  source: {
    async listForProvider(providerId) {
      return providerId === providerAdvertisingRecord.request.providerId
        ? [providerAdvertisingRecord]
        : [];
    },
    async findForProvider(providerId, requestId) {
      return providerId === providerAdvertisingRecord.request.providerId
        && requestId === providerAdvertisingRecord.request.id
        ? providerAdvertisingRecord
        : undefined;
    }
  }
});

const commissionResolution: CommissionResolution = {
  accountId: '0123456789abcdef01234567',
  source: 'policy',
  effectiveAt: '2026-08-14T00:00:00.000Z',
  sourceRecordId: 'fedcba987654321001234567',
  sourceVersion: 3,
  policyId: 'fedcba987654321001234567',
  kind: 'percentage',
  percentageBps: 250
};

const commissionProjection = createProviderCommissionProjectionService({
  source: {
    async getForProvider(providerId) {
      return providerId === commissionResolution.accountId ? commissionResolution : undefined;
    }
  }
});

const advertisingWorkflow = {
  async createRequest(claims: Parameters<typeof advertisingProjection.list>[0], input: unknown) {
    const parsed = adRequestCreateSchema.parse(input);
    return adRequestSchema.parse({
      id: 'bbbbbbbbbbbbbbbbbbbbbbbb',
      providerId: claims.sub,
      ...parsed,
      status: 'draft',
      version: 0,
      createdAt: '2026-08-13T00:00:00.000Z',
      updatedAt: '2026-08-13T00:00:00.000Z'
    });
  },
  async issueQuote(_claims: Parameters<typeof advertisingProjection.list>[0], input: unknown) {
    const requestId = (input as { requestId: string }).requestId;
    return adQuoteSchema.parse({
      id: 'cccccccccccccccccccccccc',
      requestId,
      providerId: providerAdvertisingRecord.request.providerId,
      currency: 'EGP',
      lineItems: [{ description: 'Homepage placement', quantity: 1, unitAmountMinor: 2500 }],
      totalMinor: 2500,
      validUntil: '2026-10-01T00:00:00.000Z',
      terms: 'Manual quote; payment proof is reviewed separately.',
      status: 'issued',
      issuerId: '1123456789abcdef01234567',
      version: 0,
      decisionHistory: [{ action: 'issued', actorId: '1123456789abcdef01234567', actorRole: 'admin', version: 0, createdAt: '2026-08-13T00:00:00.000Z' }],
      createdAt: '2026-08-13T00:00:00.000Z',
      updatedAt: '2026-08-13T00:00:00.000Z'
    });
  },
  async acceptQuote(_claims: Parameters<typeof advertisingProjection.list>[0], requestId: string) {
    return adQuoteSchema.parse({
      id: 'cccccccccccccccccccccccc',
      requestId,
      providerId: providerAdvertisingRecord.request.providerId,
      currency: 'EGP',
      lineItems: [{ description: 'Homepage placement', quantity: 1, unitAmountMinor: 2500 }],
      totalMinor: 2500,
      validUntil: '2026-10-01T00:00:00.000Z',
      terms: 'Manual quote; payment proof is reviewed separately.',
      status: 'accepted',
      issuerId: '1123456789abcdef01234567',
      version: 1,
      decisionHistory: [
        { action: 'issued', actorId: '1123456789abcdef01234567', actorRole: 'admin', version: 0, createdAt: '2026-08-13T00:00:00.000Z' },
        { action: 'accepted', actorId: providerAdvertisingRecord.request.providerId, actorRole: 'provider', version: 1, createdAt: '2026-08-13T00:00:00.000Z' }
      ],
      createdAt: '2026-08-13T00:00:00.000Z',
      updatedAt: '2026-08-13T00:00:00.000Z'
    });
  }
};

async function withServer(run: (baseUrl: string) => Promise<void>) {
  const server = createApiServer({
    database: { isReady: async () => true },
    provider: { service, accessTokens, cookie, advertisingProjection, advertisingWorkflow, commissionProjection }
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

test('lists and gets provider-owned advertising requests through a redacted projection', async () => {
  await withServer(async (baseUrl) => {
    const list = await fetch(`${baseUrl}/api/v1/provider/ads?page=1&limit=20`, {
      headers: { Authorization: `Bearer ${providerToken}` }
    });
    assert.equal(list.status, 200);
    const listBody = await list.json() as { data?: { items?: Array<Record<string, unknown>> } };
    assert.equal(listBody.data?.items?.length, 1);
    assert.equal('providerId' in (listBody.data?.items?.[0] ?? {}), false);

    const detail = await fetch(`${baseUrl}/api/v1/provider/ads/${providerAdvertisingRecord.request.id}`, {
      headers: { Authorization: `Bearer ${providerToken}` }
    });
    assert.equal(detail.status, 200);

    const foreign = await fetch(`${baseUrl}/api/v1/provider/ads/bbbbbbbbbbbbbbbbbbbbbbbb`, {
      headers: { Authorization: `Bearer ${providerToken}` }
    });
    assert.equal(foreign.status, 404);
  });
});

test('requires provider authentication for advertising projections', async () => {
  await withServer(async (baseUrl) => {
    const missing = await fetch(`${baseUrl}/api/v1/provider/ads`);
    assert.equal(missing.status, 401);
    const wrongRole = await fetch(`${baseUrl}/api/v1/provider/ads`, {
      headers: { Authorization: `Bearer ${seekerToken}` }
    });
    assert.equal(wrongRole.status, 403);
  });
});

test('returns the verified provider commission projection without resolver or administrative fields', async () => {
  await withServer(async (baseUrl) => {
    const missing = await fetch(`${baseUrl}/api/v1/provider/commission`);
    assert.equal(missing.status, 401);

    const wrongRole = await fetch(`${baseUrl}/api/v1/provider/commission`, {
      headers: { Authorization: `Bearer ${seekerToken}` }
    });
    assert.equal(wrongRole.status, 403);

    const response = await fetch(`${baseUrl}/api/v1/provider/commission`, {
      headers: { Authorization: `Bearer ${providerToken}` }
    });
    assert.equal(response.status, 200);
    const body = await response.json() as { data?: Record<string, unknown> };
    assert.equal(body.data?.source, 'policy');
    assert.equal(body.data?.readOnly, true);
    assert.equal(body.data?.percentageBps, 250);
    assert.equal('sourceRecordId' in (body.data ?? {}), false);
    assert.equal('policyId' in (body.data ?? {}), false);
  });
});

test('creates provider-owned advertising drafts with strict request validation', async () => {
  await withServer(async (baseUrl) => {
    const created = await fetch(`${baseUrl}/api/v1/provider/ads`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${providerToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        placementKey: 'homepage.hero',
        purpose: 'Promote a verified provider listing',
        intervalStart: '2026-09-01T09:00:00+00:00',
        intervalEnd: '2026-09-02T09:00:00+00:00'
      })
    });
    assert.equal(created.status, 201);
    const unknown = await fetch(`${baseUrl}/api/v1/provider/ads`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${providerToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        placementKey: 'homepage.hero',
        purpose: 'Reject unknown fields',
        intervalStart: '2026-09-01T09:00:00+00:00',
        intervalEnd: '2026-09-02T09:00:00+00:00',
        providerId: '999999999999999999999999'
      })
    });
    assert.equal(unknown.status, 400);
  });
});

test('quotes require an administrator boundary and provider acceptance is owner-scoped', async () => {
  await withServer(async (baseUrl) => {
    const missing = await fetch(`${baseUrl}/api/v1/admin/ad-requests/${providerAdvertisingRecord.request.id}/quote`, { method: 'POST' });
    assert.equal(missing.status, 401);
    const wrongRole = await fetch(`${baseUrl}/api/v1/admin/ad-requests/${providerAdvertisingRecord.request.id}/quote`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${providerToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ currency: 'EGP', lineItems: [{ description: 'Placement', quantity: 1, unitAmountMinor: 2500 }], validUntil: '2026-10-01T00:00:00+00:00', terms: 'Manual quote terms' })
    });
    assert.equal(wrongRole.status, 403);
    const issued = await fetch(`${baseUrl}/api/v1/admin/ad-requests/${providerAdvertisingRecord.request.id}/quote`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ currency: 'EGP', lineItems: [{ description: 'Placement', quantity: 1, unitAmountMinor: 2500 }], validUntil: '2026-10-01T00:00:00+00:00', terms: 'Manual quote terms' })
    });
    assert.equal(issued.status, 201);
    const accepted = await fetch(`${baseUrl}/api/v1/provider/ads/${providerAdvertisingRecord.request.id}/accept-quote`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${providerToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'accept', expectedVersion: 0 })
    });
    assert.equal(accepted.status, 200);
    const invalidPath = await fetch(`${baseUrl}/api/v1/provider/ads/not-an-id/accept-quote`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${providerToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'accept', expectedVersion: 0 })
    });
    assert.equal(invalidPath.status, 400);
  });
});
