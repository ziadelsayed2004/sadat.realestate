import { fireEvent, screen, waitFor } from '@testing-library/react';
import { viewingDataSchema, viewingListDataSchema, type ViewingData } from '@sadat-real-estate/contracts';
import { describe, expect, it, vi } from 'vitest';
import { ApiClient } from '../src/features/contracts/index.ts';
import { SeekerViewings, createSeekerViewingActions, getSeekerViewingsCopy, loadSeekerViewings } from '../src/features/seeker/index.ts';
import type { SeekerViewingActions } from '../src/features/seeker/index.ts';
import { renderWithLocale } from '../src/features/testing/index.ts';

const requested = viewingDataSchema.parse({
  id: '4123456789abcdef01234567',
  propertyId: '5123456789abcdef01234567',
  seekerId: '6123456789abcdef01234567',
  status: 'requested',
  requestedAt: '2026-08-25T10:00:00.000Z',
  timezone: 'Africa/Cairo',
  note: 'Please call before arriving.',
  version: 0,
  createdAt: '2026-08-18T10:00:00.000Z',
  updatedAt: '2026-08-18T10:00:00.000Z'
});

const confirmed = viewingDataSchema.parse({
  ...requested,
  id: '7123456789abcdef01234567',
  propertyId: '8123456789abcdef01234567',
  status: 'confirmed',
  requestedAt: '2026-08-26T12:00:00.000Z'
});

const completed = viewingDataSchema.parse({
  ...requested,
  id: '9123456789abcdef01234567',
  propertyId: 'a123456789abcdef01234567',
  status: 'completed',
  requestedAt: '2026-08-10T12:00:00.000Z'
});

const list = viewingListDataSchema.parse({ items: [requested, confirmed, completed], page: 1, limit: 100, total: 3 });
const session = { status: 'authenticated' as const, role: 'seeker' as const };

describe('Seeker viewing appointments', () => {
  it('loads the implemented list and mutation routes with contract-shaped requests', async () => {
    const calls: Array<{ url: string; method: string; body: string | undefined; authorization: string | null }> = [];
    const client = new ApiClient({
      fetcher: async (input, init) => {
        calls.push({ url: String(input), method: init?.method ?? 'GET', body: typeof init?.body === 'string' ? init.body : undefined, authorization: new Headers(init?.headers).get('authorization') });
        const data = (init?.method ?? 'GET') === 'GET' ? list : requested;
        return new Response(JSON.stringify({ data, meta: { requestId: 'viewing-test' } }), { status: 200 });
      }
    });
    const authorization = { getAuthorizationHeader: () => 'Bearer seeker.access.token' };
    await expect(loadSeekerViewings({ apiClient: client, authorization, query: { status: 'completed', page: 2, limit: 10 } })).resolves.toEqual(list);
    const actions = createSeekerViewingActions({ apiClient: client, authorization });
    await actions.reschedule(requested.id, { requestedAt: '2026-08-27T10:00:00.000Z', timezone: 'UTC', expectedVersion: 0 });
    await actions.cancel(requested.id, 1);
    expect(calls).toEqual([
      { url: '/api/v1/seeker/viewings?status=completed&page=2&limit=10', method: 'GET', body: undefined, authorization: 'Bearer seeker.access.token' },
      { url: `/api/v1/seeker/viewings/${requested.id}`, method: 'PATCH', body: JSON.stringify({ requestedAt: '2026-08-27T10:00:00.000Z', timezone: 'UTC', expectedVersion: 0 }), authorization: 'Bearer seeker.access.token' },
      { url: `/api/v1/seeker/viewings/${requested.id}/cancel`, method: 'POST', body: JSON.stringify({ expectedVersion: 1 }), authorization: 'Bearer seeker.access.token' }
    ]);
  });

  it.each(['ar', 'en', 'zh-CN'] as const)('renders owned appointment states in the approved direction for %s', async locale => {
    const copy = getSeekerViewingsCopy(locale);
    const result = renderWithLocale(<SeekerViewings locale={locale} session={session} load={async () => list} actions={emptyActions()} />, { locale });
    await waitFor(() => expect(screen.getByTestId(`seeker-viewing-${requested.id}`)).toBeInTheDocument());
    expect(result.direction).toBe(locale === 'ar' ? 'rtl' : 'ltr');
    expect(screen.getByRole('heading', { name: copy.title, level: 1 })).toBeInTheDocument();
    expect(screen.getByText(copy.statuses.requested)).toBeInTheDocument();
    expect(screen.getByText(copy.statuses.confirmed)).toBeInTheDocument();
    expect(result.container.querySelector('[data-screen-id="SEK-05"]')).not.toBeNull();
    expect(result.container.textContent).not.toContain(requested.seekerId);
    expect(result.container.textContent).not.toContain('providerId');
    result.unmount();
  });

  it('validates new requests and sends reschedule and cancel actions only after confirmation', async () => {
    const actions = emptyActions();
    const result = renderWithLocale(<SeekerViewings locale="en" session={session} load={async () => list} actions={actions} />, { locale: 'en' });
    await waitFor(() => expect(screen.getByTestId(`seeker-viewing-${requested.id}`)).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Request a viewing' }));
    fireEvent.click(screen.getByRole('button', { name: 'Submit request' }));
    expect(screen.getByText('Enter a valid property ID.')).toBeInTheDocument();
    expect(actions.create).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    fireEvent.click(screen.getAllByRole('button', { name: 'Reschedule' })[0]!);
    const rescheduleInput = screen.getByLabelText('Viewing time', { selector: 'input' });
    fireEvent.change(rescheduleInput, { target: { value: '2026-08-27T11:00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save appointment' }));
    await waitFor(() => expect(actions.reschedule).toHaveBeenCalledWith(requested.id, expect.objectContaining({ expectedVersion: 0, timezone: 'Africa/Cairo' })));
    await waitFor(() => expect(screen.getByTestId(`seeker-viewing-${requested.id}`)).toBeInTheDocument());

    fireEvent.click(screen.getAllByRole('button', { name: 'Cancel appointment' })[0]!);
    expect(screen.getByRole('group', { name: 'Cancel this appointment?' })).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Cancel appointment' })[1]!);
    await waitFor(() => expect(actions.cancel).toHaveBeenCalledWith(requested.id, 0));
    result.unmount();
  });

  it('fails closed for an anonymous session', () => {
    const copy = getSeekerViewingsCopy('en');
    renderWithLocale(<SeekerViewings locale="en" session={{ status: 'anonymous' }} load={async () => list} actions={emptyActions()} />, { locale: 'en' });
    expect(screen.getByRole('heading', { name: copy.states.permission.title })).toBeInTheDocument();
  });
});

function emptyActions(): SeekerViewingActions & { readonly create: ReturnType<typeof vi.fn>; readonly reschedule: ReturnType<typeof vi.fn>; readonly cancel: ReturnType<typeof vi.fn> } {
  return {
    create: vi.fn().mockResolvedValue(requested),
    reschedule: vi.fn().mockResolvedValue(requested),
    cancel: vi.fn().mockResolvedValue({ ...requested, status: 'cancelled' } as ViewingData)
  };
}
