import assert from 'node:assert/strict';
import test from 'node:test';
import { z, ZodError } from 'zod';
import {
  ApiContractError,
  API_ERROR_STATUS,
  toApiErrorResponse
} from '../../src/modules/contracts/error-boundary.js';
import { toSuccessResponse } from '../../src/modules/contracts/response.js';
import {
  apiErrorSchema,
  createSuccessEnvelope,
  errorEnvelopeSchema,
  successEnvelopeSchema
} from '@sadat-real-estate/contracts';

test('accepts strict success envelopes and validates nested data', () => {
  const schema = successEnvelopeSchema(z.object({ id: z.string() }).strict());
  assert.deepEqual(
    schema.parse({ data: { id: 'property-1' }, meta: { requestId: 'req-1' } }),
    { data: { id: 'property-1' }, meta: { requestId: 'req-1' } }
  );
  assert.throws(() => schema.parse({ data: { id: 3 }, meta: { requestId: 'req-1' } }));
  assert.throws(() => schema.parse({ data: { id: 'property-1' }, meta: { requestId: 'req-1', secret: 'nope' } }));
});

test('accepts the error envelope and rejects malformed identifiers or extra fields', () => {
  const valid = {
    error: {
      code: 'PROPERTY_NOT_FOUND',
      messageKey: 'errors.propertyNotFound',
      details: [{ path: ['propertyId'], code: 'VALIDATION_FAILED', messageKey: 'errors.invalidInput' }],
      requestId: 'req-2'
    }
  };
  assert.deepEqual(errorEnvelopeSchema.parse(valid), valid);
  assert.throws(() => errorEnvelopeSchema.parse({ ...valid, error: { ...valid.error, code: 'property-not-found' } }));
  assert.throws(() => errorEnvelopeSchema.parse({ ...valid, error: { ...valid.error, stack: 'secret' } }));
  assert.throws(() => apiErrorSchema.parse({ ...valid.error, requestId: 'bad id' }));
});

test('builds a validated success envelope with request metadata', () => {
  assert.deepEqual(createSuccessEnvelope({ ok: true }, 'req-3', { page: 1, limit: 20 }), {
    data: { ok: true },
    meta: { requestId: 'req-3', page: 1, limit: 20 }
  });
});

test('API success helper delegates to the shared contract', () => {
  assert.deepEqual(toSuccessResponse({ ok: true }, 'req-3b'), {
    data: { ok: true },
    meta: { requestId: 'req-3b' }
  });
});

test('maps validation and known errors while redacting unknown errors', () => {
  const zodResponse = toApiErrorResponse(new ZodError([{ code: 'custom', path: ['email'], message: 'secret input' }]), 'req-4');
  assert.equal(zodResponse.statusCode, API_ERROR_STATUS.VALIDATION_FAILED);
  assert.deepEqual(zodResponse.body.error.details, [{ path: ['email'], code: 'VALIDATION_FAILED', messageKey: 'errors.invalidInput' }]);

  const knownResponse = toApiErrorResponse(new ApiContractError('FORBIDDEN', 'errors.forbidden', 403), 'req-5');
  assert.equal(knownResponse.statusCode, 403);
  assert.equal(knownResponse.body.error.code, 'FORBIDDEN');

  const unknownResponse = toApiErrorResponse(new Error('mongodb://user:password@secret.invalid'), 'req-6');
  assert.equal(unknownResponse.statusCode, 500);
  assert.deepEqual(unknownResponse.body, {
    error: { code: 'INTERNAL_ERROR', messageKey: 'errors.internal', details: [], requestId: 'req-6' }
  });
  assert.doesNotMatch(JSON.stringify(unknownResponse.body), /password|secret\.invalid/);
});
