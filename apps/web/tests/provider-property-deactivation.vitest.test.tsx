import { fireEvent, screen, waitFor } from '@testing-library/react';
import { propertyDataSchema } from '@sadat-real-estate/contracts';
import { expect, it, vi } from 'vitest';
import { PropertyDeactivationRequest } from '../src/features/provider_property/deactivation.tsx';
import { requestProviderPropertyDeactivation, startProviderPropertyEdit } from '../src/features/provider_property/data.ts';
import { ApiClient, ApiClientError } from '../src/features/contracts/index.ts';
import { renderWithLocale } from '../src/features/testing/index.ts';

const published = propertyDataSchema.parse({
  id: 'a'.repeat(24), kind: 'property', name: { en: 'Villa' }, slug: 'villa', transactionType: 'sale',
  source: { providerId: 'b'.repeat(24), sourceType: 'individual_broker' }, status: 'published', active: true,
  version: 3, createdAt: '2026-10-13T08:00:00.000Z', updatedAt: '2026-10-13T08:00:00.000Z',
  availableActions: ['start_edit', 'request_deactivation']
});

it.each(['ar', 'en'] as const)('submits the reason once, then displays the pending server decision in %s', async locale => {
  let resolve!: () => void;
  const submit = vi.fn(() => new Promise<void>(done => { resolve = done; }));
  const startEdit = vi.fn();
  const view = renderWithLocale(<PropertyDeactivationRequest property={published} locale={locale} submit={submit} startEdit={startEdit} />, { locale });
  const form = view.container.querySelector('form')!;
  fireEvent.change(screen.getByRole('textbox'), { target: { value: '  Property has been sold  ' } });
  fireEvent.submit(form); fireEvent.submit(form);
  expect(submit).toHaveBeenCalledExactlyOnceWith('Property has been sold');
  expect(screen.getByRole('textbox')).toBeDisabled();
  expect(screen.getByRole('button', { name: locale === 'ar' ? 'بدء تعديل العقار' : 'Start editing property' })).toBeDisabled();
  resolve();
  await waitFor(() => expect(screen.getByRole('textbox')).toHaveValue(''));
  view.rerender(<PropertyDeactivationRequest property={{ ...published, availableActions: [], deactivationRequest: { status: 'pending', reason: 'Property has been sold', requestedAt: published.updatedAt } }} locale={locale} submit={submit} startEdit={startEdit} />);
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent(locale === 'ar' ? 'بانتظار موافقة الإدارة' : 'awaiting administration approval');
  expect(startEdit).not.toHaveBeenCalled();
});

it('keeps the reason on conflict and does not claim the request succeeded', async () => {
  const submit = vi.fn().mockRejectedValue(new ApiClientError('Version conflict', { status: 409, code: 'HTTP_ERROR' }));
  renderWithLocale(<PropertyDeactivationRequest property={published} locale="en" submit={submit} startEdit={vi.fn()} />, { locale: 'en' });
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Property is unavailable' } });
  fireEvent.click(screen.getByRole('button', { name: 'Send deactivation request' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('The property changed');
  expect(screen.getByRole('textbox')).toHaveValue('Property is unavailable');
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});

it('explains that editing temporarily removes publication before starting the edit', async () => {
  const startEdit = vi.fn().mockResolvedValue(undefined);
  renderWithLocale(<PropertyDeactivationRequest property={published} locale="en" submit={vi.fn()} startEdit={startEdit} />, { locale: 'en' });
  expect(screen.getByText(/Starting an edit temporarily removes/u)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Start editing property' }));
  await waitFor(() => expect(startEdit).toHaveBeenCalledOnce());
});

it.each(['approved', 'rejected'] as const)('renders the saved %s decision and its reason', status => {
  renderWithLocale(<PropertyDeactivationRequest property={{ ...published, availableActions: [], deactivationRequest: { status, reason: 'Sold property', requestedAt: published.updatedAt, decisionReason: 'Administration checked availability' } }} locale="en" submit={vi.fn()} startEdit={vi.fn()} />, { locale: 'en' });
  expect(screen.getByRole('status')).toHaveTextContent(status);
  expect(screen.getByRole('status')).toHaveTextContent('Administration checked availability');
});

it.each([
  [requestProviderPropertyDeactivation, 'deactivation-request'],
  [startProviderPropertyEdit, 'start-edit']
] as const)('sends the strict authorized mutation to its server endpoint: %s', async (action, suffix) => {
  const fetcher = vi.fn(async () => new Response(JSON.stringify({ data: published, meta: { requestId: 'property-change' } }), { status: 200 }));
  const apiClient = new ApiClient({ fetcher });
  await action({ version: 3, reason: 'Property has been sold' }, { propertyId: published.id, apiClient, authorization: { getAuthorizationHeader: () => 'Bearer provider-token' } });
  const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
  expect(url).toContain(`/provider/properties/${published.id}/${suffix}`);
  expect(init.method).toBe('POST');
  expect(new Headers(init.headers).get('authorization')).toBe('Bearer provider-token');
  expect(JSON.parse(String(init.body))).toEqual({ version: 3, reason: 'Property has been sold' });
});
