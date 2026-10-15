import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { commissionAccountOverrideSchema } from '@sadat-real-estate/contracts';
import { AccountAssignments } from '../src/features/admin_commissions/account-assignments.tsx';
import { renderWithLocale } from '../src/features/testing/index.ts';

const item = commissionAccountOverrideSchema.parse({ id: 'aaaaaaaaaaaaaaaaaaaaaaaa', accountId: 'bbbbbbbbbbbbbbbbbbbbbbbb', kind: 'percentage', percentageBps: 350, effectiveFrom: '2026-10-15T00:00:00.000Z', status: 'active', version: 4, source: 'account_override', createdBy: 'cccccccccccccccccccccccc', updatedBy: 'cccccccccccccccccccccccc', createdAt: '2026-10-15T00:00:00.000Z', updatedAt: '2026-10-15T00:00:00.000Z' });
describe('Saved account assignments', () => {
  it('requires a reason and the loaded version, retains cancelled history and refreshes the effective value', async () => {
    let archived = false;
    const source = { loadAssignments: vi.fn(async () => ({ items: [{ ...item, status: archived ? 'archived' as const : item.status }], total: 1, page: 1, limit: 20 })), updateAssignment: vi.fn(async () => { archived = true; return { ...item, status: 'archived' as const, version: 5 }; }) };
    const changed = vi.fn(async () => {});
    renderWithLocale(<AccountAssignments accountId={item.accountId} locale="en" source={source} canManage revision={0} onChanged={changed} />, { locale: 'en' });
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel saved assignment' }));
    expect(screen.getByRole('button', { name: 'Confirm cancellation' })).toBeDisabled();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Replace incorrect assignment' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm cancellation' }));
    await waitFor(() => expect(changed).toHaveBeenCalledOnce());
    expect(source.updateAssignment).toHaveBeenCalledWith(item.accountId, item.id, { expectedVersion: 4, status: 'archived', reason: 'Replace incorrect assignment' });
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Cancel saved assignment' })).not.toBeInTheDocument());
    expect(screen.getByTestId(`account-assignment-${item.id}`)).toBeInTheDocument();
  });
  it('allows a viewer to inspect assignments without cancellation controls', async () => {
    const source = { loadAssignments: vi.fn(async () => ({ items: [item], total: 1, page: 1, limit: 20 })), updateAssignment: vi.fn(async () => item) };
    renderWithLocale(<AccountAssignments accountId={item.accountId} locale="ar" source={source} canManage={false} revision={0} onChanged={async () => {}} />, { locale: 'ar' });
    await screen.findByTestId(`account-assignment-${item.id}`);
    expect(screen.queryByRole('button', { name: 'إلغاء التخصيص المحفوظ' })).not.toBeInTheDocument();
    expect(source.updateAssignment).not.toHaveBeenCalled();
  });
});
