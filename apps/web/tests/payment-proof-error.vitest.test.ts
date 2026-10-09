import { describe, expect, it } from 'vitest';
import { ApiClientError } from '../src/features/contracts/index.ts';
import { paymentProofError } from '../src/features/provider/payment-proof-error.ts';

describe('receipt upload errors', () => {
  it.each(['ar', 'en'] as const)('explains rejected extensions and corrupt files in %s', locale => {
    const error = (code: string) => new ApiClientError('internal message', { code: 'HTTP_ERROR', status: 400, apiError: { code, messageKey: 'errors.invalidInput', details: [], requestId: 'receipt-error' } });
    expect(paymentProofError(error('DOUBLE_EXTENSION_REJECTED'), locale, 'fallback')).not.toBe('fallback');
    expect(paymentProofError(error('INVALID_FILE_SIGNATURE'), locale, 'fallback')).not.toBe('fallback');
    expect(paymentProofError(new ApiClientError('unavailable', { code: 'HTTP_ERROR', status: 503 }), locale, 'fallback')).not.toBe('fallback');
  });
});
