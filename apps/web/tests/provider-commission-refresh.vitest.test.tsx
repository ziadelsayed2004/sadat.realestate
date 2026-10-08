import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { providerCommissionProjectionSchema } from '@sadat-real-estate/contracts';
import { ProviderCommission } from '../src/features/provider/advertising.tsx';
import { getProviderAdvertisingCopy } from '../src/features/provider/advertising-copy.ts';
import { ApiClientError } from '../src/features/contracts/index.ts';
import { renderWithLocale } from '../src/features/testing/index.ts';

const session = { status: 'authenticated' as const, role: 'provider' as const };
const policy = providerCommissionProjectionSchema.parse({ accountId: 'aaaaaaaaaaaaaaaaaaaaaaaa', source: 'policy', effectiveAt: '2026-01-01T00:00:00.000Z', policyVersion: 1, kind: 'percentage', percentageBps: 250, readOnly: true });

describe('current provider commission', () => {
  it('refreshes the applied exception and does not reuse confirmation of a different source with the same version', async () => {
    const exception = providerCommissionProjectionSchema.parse({ ...policy, source: 'exception', percentageBps: 100, effectiveAt: '2026-10-08T10:00:00.000Z' });
    const load = vi.fn(async () => exception);
    const confirm = vi.fn(async () => ({ confirmationId: 'bbbbbbbbbbbbbbbbbbbbbbbb', policyVersion: 1, status: 'acknowledged' as const, effectiveAt: policy.effectiveAt, acknowledgedAt: '2026-10-08T11:00:00.000Z' }));
    const copy = getProviderAdvertisingCopy('en').commission;
    renderWithLocale(<ProviderCommission locale="en" session={session} initialData={policy} load={load} confirm={confirm} />, { locale: 'en' });
    fireEvent.click(screen.getByRole('button', { name: copy.confirm }));
    await waitFor(() => expect(screen.getByText(copy.confirmed)).toBeInTheDocument());
    fireEvent(window, new Event('focus'));
    await waitFor(() => expect(screen.getByText('1%')).toBeInTheDocument());
    expect(screen.getByText('Approved exception')).toBeInTheDocument();
    expect(screen.queryByText(copy.confirmed)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: copy.confirm })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Refresh commission' }));
    await waitFor(() => expect(load).toHaveBeenCalledTimes(2));
  });

  it('shows an actionable permission state instead of a blank card on a forbidden response', async () => {
    const copy = getProviderAdvertisingCopy('en');
    renderWithLocale(<ProviderCommission locale="en" session={session} load={async () => { throw new ApiClientError('Forbidden', { code: 'HTTP_ERROR', status: 403 }); }} />, { locale: 'en' });
    await waitFor(() => expect(screen.getByRole('heading', { name: copy.states.permission.title })).toBeInTheDocument());
  });
});
