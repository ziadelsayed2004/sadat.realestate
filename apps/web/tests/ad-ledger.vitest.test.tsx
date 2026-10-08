import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { adLedgerListDataSchema } from '@sadat-real-estate/contracts';
import { AdLedgerTable } from '../src/features/admin_ads/ledger.tsx';
import { renderWithLocale } from '../src/features/testing/index.ts';

describe('Owner-facing advertising activity', () => {
  it.each(['ar', 'en'] as const)('explains events in %s without exposing internal enums or an invented payment amount', locale => {
    const requestId = 'a'.repeat(24);
    const data = adLedgerListDataSchema.parse({ items: [{ id: 'b'.repeat(24), requestId, providerId: 'c'.repeat(24), placementKey: 'homepage.hero', kind: 'payment_proof_approved', source: 'payment_proof', occurredAt: '2026-10-07T12:00:00Z', accountingTreatment: 'not_realized' }], page: 1, limit: 20, total: 1 });
    renderWithLocale(<AdLedgerTable data={data} locale={locale} />, { locale });
    const row = screen.getByTestId(`admin-ledger-${'b'.repeat(24)}`);
    expect(row).not.toHaveTextContent('payment_proof');
    expect(row).not.toHaveTextContent('not_realized');
    expect(row).toHaveTextContent(locale === 'ar' ? 'اعتماد الإدارة لإيصال الدفع' : 'Administrator approved the receipt');
    expect(row).toHaveTextContent(locale === 'ar' ? 'لا يوجد مبلغ مسجل لهذه الخطوة' : 'No amount recorded for this step');
    expect(within(row).getByRole('link')).toHaveAttribute('href', `/admin/ads/requests?requestId=${requestId}&lang=${locale}`);
  });
});
