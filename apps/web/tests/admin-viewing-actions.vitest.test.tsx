import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import type { ViewingData } from '@sadat-real-estate/contracts';
import { ViewingActions } from '../src/features/admin_requests/viewing-actions.tsx';
import { ViewingTable } from '../src/features/admin_requests/viewing-table.tsx';
import { getAdminRequestsCopy } from '../src/features/admin_requests/copy.ts';
import { viewingHelp } from '../src/features/admin_requests/viewing-help.tsx';
import { ApiClientError } from '../src/features/contracts/index.ts';
import { renderWithLocale } from '../src/features/testing/index.ts';

const item: ViewingData = { id: 'a'.repeat(24), propertyId: 'b'.repeat(24), seekerId: 'c'.repeat(24), status: 'requested', requestedAt: '2026-10-10T10:00:00Z', timezone: 'Africa/Cairo', version: 3, createdAt: '2026-10-09T10:00:00Z', updatedAt: '2026-10-09T10:00:00Z', availableActions: ['confirm', 'reschedule', 'cancel'] };
afterEach(() => vi.useRealTimers());

describe('simple viewing actions', () => {
  it.each(['ar', 'en'] as const)('closes confirmation only after a successful save and preserves the dialog on failure in %s', async locale => {
    let rejectSave!: (error: unknown) => void;
    const pending = new Promise<void>((_, reject) => { rejectSave = reject; });
    const save = vi.fn().mockReturnValueOnce(pending).mockResolvedValue(undefined);
    const copy = viewingHelp(locale);
    renderWithLocale(<ViewingTable data={{ items: [item], page: 1, limit: 20, total: 1 }} locale={locale} copy={getAdminRequestsCopy(locale)} save={save} />, { locale });
    const opener = screen.getByRole('button', { name: copy.open });
    opener.focus();
    fireEvent.click(opener);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Appointment agreed with the customer' } });
    fireEvent.click(screen.getByRole('button', { name: copy.actions.confirm }));
    expect(save).toHaveBeenCalledWith(item.id, { action: 'confirm', expectedVersion: 3, reason: 'Appointment agreed with the customer' });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: copy.actions.confirm })).toBeDisabled();
    await act(async () => { rejectSave(new ApiClientError('errors.conflict', { code: 'HTTP_ERROR', status: 409 })); });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(copy.conflict);
    expect(screen.getByRole('textbox')).toHaveValue('Appointment agreed with the customer');
    fireEvent.click(screen.getByRole('button', { name: copy.actions.confirm }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(save).toHaveBeenCalledTimes(2);
    expect(opener).toHaveFocus();
    fireEvent.click(opener);
    expect(screen.getByRole('textbox')).toHaveValue('');
  });

  it('opens undated details and displays the optional WhatsApp contact to an administrator', () => {
    const undated = { ...item, customerPhone: '+201012345678', customerContactMethod: 'whatsapp' as const }; delete undated.requestedAt;
    renderWithLocale(<ViewingTable data={{ items: [undated], page: 1, limit: 20, total: 1 }} locale="en" copy={getAdminRequestsCopy('en')} save={vi.fn()} />, { locale: 'en' });
    expect(screen.getByText('To be arranged')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: viewingHelp('en').open }));
    expect(screen.getByRole('dialog')).toHaveTextContent('To be arranged');
    expect(screen.getByRole('link', { name: /201012345678/ })).toHaveAttribute('href', 'https://wa.me/201012345678');
  });
  it('starts an undated request with empty scheduling fields and cannot confirm it', () => {
    const undated = { ...item }; delete undated.requestedAt;
    const copy = viewingHelp('en');
    renderWithLocale(<ViewingActions item={undated} locale="en" save={vi.fn()} />, { locale: 'en' });
    expect(screen.queryByRole('radio', { name: new RegExp(copy.actions.confirm) })).toBeNull();
    expect(screen.getByLabelText(copy.date)).toHaveValue('');
    expect(screen.getByLabelText(copy.clock)).toHaveValue('');
  });
  it.each(['ar', 'en'] as const)('explains who sees the message and sends only the selected available action in %s', async locale => {
    const save = vi.fn().mockResolvedValue(undefined); const copy = viewingHelp(locale);
    renderWithLocale(<ViewingActions item={item} locale={locale} save={save} />, { locale });
    expect(screen.getByText(copy.reasonHint)).toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: new RegExp(copy.actions.complete) })).toBeNull();
    fireEvent.submit(screen.getByRole('button', { name: copy.actions.confirm }).closest('form')!);
    expect(save).not.toHaveBeenCalled();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'The agreed appointment is confirmed.' } });
    fireEvent.click(screen.getByRole('button', { name: copy.actions.confirm }));
    await waitFor(() => expect(save).toHaveBeenCalledWith({ action: 'confirm', expectedVersion: 3, reason: 'The agreed appointment is confirmed.' }));
    expect(screen.getByRole('status')).toHaveTextContent(copy.saved);
  });

  it('validates the future appointment and converts Egypt time before sending, preserving input on conflicts', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-09T08:00:00Z'));
    const save = vi.fn().mockRejectedValueOnce(new ApiClientError('errors.conflict', { code: 'HTTP_ERROR', status: 409 }));
    const copy = viewingHelp('en');
    renderWithLocale(<ViewingActions item={item} locale="en" save={save} />, { locale: 'en' });
    fireEvent.click(screen.getByRole('radio', { name: new RegExp(copy.actions.reschedule) }));
    fireEvent.change(screen.getByLabelText(copy.date), { target: { value: '2020-01-01' } });
    fireEvent.change(screen.getByLabelText(copy.clock), { target: { value: '13:30' } });
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Customer agreed to the new appointment.' } });
    fireEvent.click(screen.getByRole('button', { name: copy.actions.reschedule }));
    expect(save).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(copy.dateError);
    const future = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
    fireEvent.change(screen.getByLabelText(copy.date), { target: { value: future } });
    fireEvent.click(screen.getByRole('button', { name: copy.actions.reschedule }));
    await waitFor(() => expect(save).toHaveBeenCalledWith(expect.objectContaining({ action: 'reschedule', timezone: 'Africa/Cairo', expectedVersion: 3, requestedAt: `${future}T10:30:00.000Z` })));
    expect(screen.getByRole('textbox')).toHaveValue('Customer agreed to the new appointment.');
    expect(screen.getByRole('alert')).toHaveTextContent(copy.conflict);
  });

  it('explains read-only access and completed records without offering actions', () => {
    const save = vi.fn();
    const result = renderWithLocale(<ViewingActions item={{ ...item, availableActions: [] }} locale="en" save={save} />, { locale: 'en' });
    expect(screen.getByText(viewingHelp('en').permission)).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull(); result.unmount();
    renderWithLocale(<ViewingActions item={{ ...item, status: 'completed', availableActions: [] }} locale="en" save={save} />, { locale: 'en' });
    expect(screen.getByText(viewingHelp('en').closed)).toBeInTheDocument();
  });
});
