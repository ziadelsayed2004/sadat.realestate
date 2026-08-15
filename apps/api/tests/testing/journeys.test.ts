import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import test from 'node:test';
import type { AccessTokenClaims } from '../../src/modules/auth/crypto.js';
import { createAdSettingsService, AdSettingsServiceError } from '../../src/modules/ads/service.js';
import { createPaymentProofService } from '../../src/modules/payments/service.js';
import { createDeterministicMalwareScanner, createInMemoryStorageAdapter } from '../../src/modules/uploads/adapters.js';
import { createCommissionPolicyService } from '../../src/modules/commissions/policy-service.js';
import { createCommissionResolverService } from '../../src/modules/commissions/resolver-service.js';
import { createProviderCommissionProjectionService } from '../../src/modules/provider/commission.js';
import {
  BACKEND_JOURNEY_STEPS,
  runBackendJourneys,
  validateBackendJourneyDefinitions,
  type BackendJourneyExecutor,
  type BackendJourneyStep
} from '../../src/modules/testing/journeys.js';

const admin = {
  iss: 'sadat-realestate-api', aud: 'sadat-realestate', sub: '3123456789abcdef01234567',
  sid: '1123456789abcdef01234567', role: 'admin', status: 'verified', iat: 1,
  exp: 9_999_999_999, jti: 'journey-admin'
} as AccessTokenClaims;
const provider = {
  ...admin, sub: '2123456789abcdef01234567', role: 'provider', jti: 'journey-provider'
} as AccessTokenClaims;

function syntheticExecutor(): BackendJourneyExecutor & { readonly state: Record<string, boolean> } {
  const state: Record<string, boolean> = {
    seekerRegistered: false,
    providerRegistered: false,
    applicationComplete: false,
    projectPublished: false,
    propertySubmitted: false,
    propertyPublished: false,
    requestCreated: false,
    requestResolved: false,
    adWaitingPayment: false,
    paymentApproved: false,
    commissionSnapshotted: false,
    cleaned: false
  };
  const execute = async (step: BackendJourneyStep) => {
    switch (step.id) {
      case 'seeker-registration': state.seekerRegistered = true; return { outcome: 'success' as const, statusCode: 201 };
      case 'provider-registration': state.providerRegistered = true; return { outcome: 'success' as const, statusCode: 201 };
      case 'provider-submit-incomplete-negative':
        assert.equal(state.providerRegistered, true);
        assert.equal(state.applicationComplete, false);
        return { outcome: 'validation_error' as const, statusCode: 409 };
      case 'provider-account-step':
      case 'provider-business-step':
      case 'provider-company-step':
        assert.equal(state.providerRegistered, true);
        return { outcome: 'success' as const, statusCode: 200 };
      case 'provider-application-submit': state.applicationComplete = true; return { outcome: 'success' as const, statusCode: 200 };
      case 'provider-project-create': assert.equal(state.applicationComplete, true); return { outcome: 'success' as const, statusCode: 201 };
      case 'provider-project-submit': return { outcome: 'success' as const, statusCode: 200 };
      case 'admin-project-review': state.projectPublished = true; return { outcome: 'success' as const, statusCode: 200 };
      case 'provider-property-create': assert.equal(state.projectPublished, true); return { outcome: 'success' as const, statusCode: 201 };
      case 'provider-property-save-basic': return { outcome: 'success' as const, statusCode: 200 };
      case 'provider-property-submit': state.propertySubmitted = true; return { outcome: 'success' as const, statusCode: 200 };
      case 'admin-property-review': assert.equal(state.propertySubmitted, true); return { outcome: 'success' as const, statusCode: 200 };
      case 'admin-property-visibility': state.propertyPublished = true; return { outcome: 'success' as const, statusCode: 200 };
      case 'public-property-details': assert.equal(state.propertyPublished, true); return { outcome: 'success' as const, statusCode: 200 };
      case 'seeker-request': state.requestCreated = true; return { outcome: 'success' as const, statusCode: 201 };
      case 'provider-customer-request': assert.equal(state.requestCreated, true); return { outcome: 'success' as const, statusCode: 201 };
      case 'admin-assign-request': assert.equal(state.requestCreated, true); return { outcome: 'success' as const, statusCode: 200 };
      case 'admin-resolve-request': state.requestResolved = true; return { outcome: 'success' as const, statusCode: 200 };
      case 'seeker-request-idor-negative': assert.equal(state.requestResolved, true); return { outcome: 'forbidden' as const, statusCode: 403 };
      case 'ad-placement': return { outcome: 'success' as const };
      case 'ad-request-draft': return { outcome: 'success' as const };
      case 'ad-request-review': return { outcome: 'success' as const };
      case 'ad-quote-issued': return { outcome: 'success' as const };
      case 'ad-quote-accepted': state.adWaitingPayment = true; return { outcome: 'success' as const };
      case 'payment-proof-reviewed': assert.equal(state.adWaitingPayment, true); state.paymentApproved = true; return { outcome: 'success' as const };
      case 'commission-policy-resolved': assert.equal(state.paymentApproved, true); return { outcome: 'success' as const };
      case 'commission-event-snapshotted': state.commissionSnapshotted = true; return { outcome: 'success' as const };
      case 'commission-provider-projection': assert.equal(state.commissionSnapshotted, true); return { outcome: 'success' as const };
      case 'cleanup-request': state.requestCreated = false; return { outcome: 'cleanup' as const };
      case 'cleanup-advertising-draft': state.adWaitingPayment = false; return { outcome: 'cleanup' as const };
      case 'cleanup-session': state.cleaned = true; return { outcome: 'cleanup' as const };
      default: throw new Error(`Unexpected journey step ${step.id}`);
    }
  };
  return { execute, state };
}

test('journey definitions cover registration, publication, requests, ads, commissions, and cleanup', () => {
  assert.deepEqual(validateBackendJourneyDefinitions(), []);
  assert.deepEqual(new Set(BACKEND_JOURNEY_STEPS.map(step => step.journey)), new Set([
    'registration_to_publication', 'requests', 'advertising', 'commissions', 'cleanup'
  ]));
  assert.ok(BACKEND_JOURNEY_STEPS.some(step => step.expectation === 'validation_error'));
  assert.ok(BACKEND_JOURNEY_STEPS.some(step => step.expectation === 'forbidden'));
  assert.ok(BACKEND_JOURNEY_STEPS.every(step => step.kind !== 'route' || (step.method && step.path)));
});

test('runs the ordered synthetic journey and completes cleanup', async () => {
  const executor = syntheticExecutor();
  const report = await runBackendJourneys(executor, { now: () => new Date('2026-09-01T12:00:00.000Z') });
  assert.equal(report.version, 'backend-journeys-v1');
  assert.equal(report.synthetic, true);
  assert.equal(report.cleanupCompleted, true);
  assert.equal(report.steps.length, BACKEND_JOURNEY_STEPS.length);
  assert.deepEqual(report.steps.map(step => step.order), [...report.steps].map(step => step.order).sort((a, b) => a - b));
  assert.equal(report.steps.find(step => step.id === 'provider-submit-incomplete-negative')?.outcome, 'validation_error');
  assert.equal(report.steps.find(step => step.id === 'seeker-request-idor-negative')?.outcome, 'forbidden');
  assert.equal(executor.state.cleaned, true);
});

test('runs cleanup after a failed mandatory step', async () => {
  const executed: string[] = [];
  const executor: BackendJourneyExecutor = {
    async execute(step) {
      executed.push(step.id);
      if (step.id === 'provider-project-submit') throw new Error('synthetic journey failure');
      return { outcome: step.expectation };
    }
  };
  await assert.rejects(() => runBackendJourneys(executor), /synthetic journey failure/);
  assert.deepEqual(executed.slice(-3), ['cleanup-request', 'cleanup-advertising-draft', 'cleanup-session']);
});

test('executes real advertising, payment-proof, and commission service boundaries with idempotent cleanup inputs', async () => {
  const current = new Date('2026-09-01T06:00:00.000Z');
  const ads = createAdSettingsService({ now: () => current });
  await ads.createPlacement(admin, {
    key: 'journey.homepage', surface: 'homepage', label: { en: 'Journey placement' }, width: 900, height: 300,
    active: true, sortOrder: 1, allowedLocales: ['en'], targetUrlRequired: true
  });
  const adRequest = await ads.createRequest(provider, {
    placementKey: 'journey.homepage', purpose: 'Synthetic journey campaign',
    intervalStart: '2026-09-01T09:00:00+03:00', intervalEnd: '2026-09-01T10:00:00+03:00'
  });
  await ads.transitionRequest(provider, adRequest.id, { status: 'review', expectedVersion: 0 });
  await ads.transitionRequest(admin, adRequest.id, { status: 'waiting_pricing', expectedVersion: 1 });
  const quote = await ads.issueQuote(admin, {
    requestId: adRequest.id, currency: 'EGP', lineItems: [{ description: 'Journey slot', quantity: 1, unitAmountMinor: 1250 }],
    validUntil: '2026-09-02T00:00:00+03:00', terms: 'Synthetic isolated test quote'
  });
  await ads.decideQuote(provider, quote.id, { action: 'accept', expectedVersion: 0 });
  const payable = (await ads.listRequests(provider)).find(item => item.id === adRequest.id);
  assert.equal(payable?.status, 'waiting_payment');
  const payableVersion = payable?.version ?? -1;
  assert.ok(payableVersion >= 0);

  const payment = createPaymentProofService({
    storage: createInMemoryStorageAdapter(),
    scanner: createDeterministicMalwareScanner('clean'),
    findPayableAdRequest: (providerId, requestId) => requestId === adRequest.id && providerId === provider.sub
      ? { id: adRequest.id, providerId, status: payable?.status ?? 'draft' } : undefined,
    authorization: { authorize: async (_adminId, permission) => permission === 'admin:payments.review' },
    audit: { record: async () => undefined }
  });
  const proof = await payment.upload(provider, adRequest.id, {
    filename: 'journey-proof.pdf', contentType: 'application/pdf', contentLength: 28
  }, Readable.from(Buffer.from('%PDF-1.7\njourney\n%%EOF', 'ascii')));
  assert.equal(proof.status, 'pending_review');
  const approved = await payment.review(admin, proof.id, {
    action: 'approve', expectedVersion: proof.version, reason: 'Synthetic proof review'
  }, { requestId: 'journey-payment-review', traceId: 'j'.repeat(32) });
  assert.equal(approved.status, 'approved');
  const replay = await payment.review(admin, proof.id, {
    action: 'approve', expectedVersion: approved.version, reason: 'Idempotent replay'
  }, { requestId: 'journey-payment-replay', traceId: 'k'.repeat(32) });
  assert.equal(replay.version, approved.version);

  const policyService = createCommissionPolicyService({ now: () => current });
  const policy = await policyService.createPolicy(admin, {
    key: 'journey-default', label: 'Journey default', kind: 'percentage', scope: { kind: 'default' }, percentageBps: 250,
    effectiveFrom: '2026-08-01T00:00:00+00:00'
  });
  const activePolicy = await policyService.activatePolicy(admin, policy.id, policy.version, 'Synthetic journey activation');
  const resolver = createCommissionResolverService({ policies: [activePolicy], now: () => current });
  const snapshot = await resolver.resolveAndSnapshot({
    commercialEventId: 'journey:ad-approved', commercialEventStatus: 'approved', accountId: provider.sub,
    approvedAt: current.toISOString()
  });
  assert.equal(snapshot.resolution.source, 'policy');
  const projection = createProviderCommissionProjectionService({
    source: { getForProvider: async (providerId) => providerId === provider.sub ? snapshot.resolution : undefined },
    now: () => current
  });
  const providerProjection = await projection.get(provider);
  assert.equal(providerProjection.readOnly, true);
  assert.equal(providerProjection.policyVersion, activePolicy.version);

  await assert.rejects(() => ads.transitionRequest({ ...provider, sub: '2223456789abcdef01234567' } as AccessTokenClaims, adRequest.id, {
    status: 'cancelled', expectedVersion: payableVersion, reason: 'Cross-owner cleanup attempt'
  }), (error) => error instanceof AdSettingsServiceError && error.code === 'FORBIDDEN');
  const expired = await ads.transitionRequest(provider, adRequest.id, { status: 'expired', expectedVersion: payableVersion, reason: 'Synthetic cleanup' });
  assert.equal(expired.status, 'expired');
});
