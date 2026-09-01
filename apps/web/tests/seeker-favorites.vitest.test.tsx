import { fireEvent, screen, waitFor } from '@testing-library/react';
import { favoriteListDataSchema, favoritePropertySchema, type FavoriteRemoveData, type FavoriteSaveData } from '@sadat-real-estate/contracts';
import { describe, expect, it, vi } from 'vitest';
import { ApiClient, ApiClientError } from '../src/features/contracts/index.ts';
import { SeekerSaved, createSeekerFavoriteActions, getSeekerSavedCopy, loadSeekerFavorites } from '../src/features/seeker/index.ts';
import type { SeekerFavoriteActions } from '../src/features/seeker/index.ts';
import { renderWithLocale } from '../src/features/testing/index.ts';

const saved = favoritePropertySchema.parse({
  id: '4123456789abcdef01234567',
  slug: 'published-home',
  kind: 'property',
  name: { ar: 'منزل منشور', en: 'Published home',},
  transactionType: 'sale',
  area: { value: 120, unit: 'sqm' },
  layout: { bedrooms: 3, bathrooms: 2, floor: 4 },
  price: { amount: 1250000, currency: 'EGP' },
  savedAt: '2026-08-18T10:00:00.000Z'
});

const secondSaved = favoritePropertySchema.parse({
  ...saved,
  id: '5123456789abcdef01234567',
  slug: 'central-apartment',
  kind: 'unit',
  transactionType: 'rent',
  name: { ar: 'شقة مركزية', en: 'Central apartment',},
  savedAt: '2026-08-17T10:00:00.000Z'
});

const list = favoriteListDataSchema.parse({ items: [saved, secondSaved], page: 1, limit: 20, total: 2 });
const session = { status: 'authenticated' as const, role: 'seeker' as const };

describe('Seeker saved properties', () => {
  it('loads the list and idempotent save/remove routes with the shared contracts', async () => {
    const calls: Array<{ url: string; method: string; body: string | undefined; authorization: string | null }> = [];
    const client = new ApiClient({
      fetcher: async (input, init) => {
        calls.push({ url: String(input), method: init?.method ?? 'GET', body: typeof init?.body === 'string' ? init.body : undefined, authorization: new Headers(init?.headers).get('authorization') });
        const method = init?.method ?? 'GET';
        const data = method === 'GET' ? list : method === 'PUT' ? { saved: true, alreadySaved: true, item: saved } : { removed: true };
        return new Response(JSON.stringify({ data, meta: { requestId: 'favorites-test' } }), { status: 200 });
      }
    });
    const authorization = { getAuthorizationHeader: () => 'Bearer seeker.access.token' };
    await expect(loadSeekerFavorites({ apiClient: client, authorization, query: { page: 2, limit: 5 } })).resolves.toEqual(list);
    const actions = createSeekerFavoriteActions({ apiClient: client, authorization });
    await expect(actions.save(saved.id)).resolves.toEqual({ saved: true, alreadySaved: true, item: saved });
    await expect(actions.remove(saved.id)).resolves.toEqual({ removed: true });
    expect(calls).toEqual([
      { url: '/api/v1/seeker/favorites?page=2&limit=5', method: 'GET', body: undefined, authorization: 'Bearer seeker.access.token' },
      { url: `/api/v1/seeker/favorites/${saved.id}`, method: 'PUT', body: undefined, authorization: 'Bearer seeker.access.token' },
      { url: `/api/v1/seeker/favorites/${saved.id}`, method: 'DELETE', body: undefined, authorization: 'Bearer seeker.access.token' }
    ]);
  });

  it.each(['ar', 'en',] as const)('renders safe saved property projections in the approved direction for %s', async locale => {
    const copy = getSeekerSavedCopy(locale);
    const result = renderWithLocale(<SeekerSaved locale={locale} session={session} load={async () => list} actions={emptyActions()} />, { locale });
    await waitFor(() => expect(screen.getByTestId(`seeker-saved-property-${saved.id}`)).toBeInTheDocument());
    expect(result.direction).toBe(locale === 'ar' ? 'rtl' : 'ltr');
    expect(screen.getByRole('heading', { name: copy.title, level: 1 })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: copy.view })[0]).toHaveAttribute('href', `/properties/${saved.slug}?lang=${locale}`);
    expect(result.container.querySelector('[data-screen-id="SEK-06"]')).not.toBeNull();
    expect(result.container.textContent).not.toContain('seekerId');
    expect(result.container.textContent).not.toContain('providerId');
    result.unmount();
  });

  it('removes a saved property and preserves an idempotent unavailable response', async () => {
    const actions = emptyActions();
    const result = renderWithLocale(<SeekerSaved locale="en" session={session} load={async () => list} actions={actions} />, { locale: 'en' });
    await waitFor(() => expect(screen.getByTestId(`seeker-saved-property-${saved.id}`)).toBeInTheDocument());
    fireEvent.click(screen.getAllByRole('button', { name: 'Remove' })[0]!);
    await waitFor(() => expect(actions.remove).toHaveBeenCalledWith(saved.id));
    expect(result.container.querySelector('.seeker-saved__feedback[data-state="success"]')).toHaveTextContent('Property removed from saved properties.');
    result.unmount();

    const unavailableActions = emptyActions();
    unavailableActions.remove.mockRejectedValue(new ApiClientError('Unavailable', { code: 'HTTP_ERROR', status: 404 }));
    renderWithLocale(<SeekerSaved locale="en" session={session} load={async () => list} actions={unavailableActions} />, { locale: 'en' });
    await waitFor(() => expect(screen.getByTestId(`seeker-saved-property-${saved.id}`)).toBeInTheDocument());
    fireEvent.click(screen.getAllByRole('button', { name: 'Remove' })[0]!);
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('This property is no longer available.'));
  });

  it('keeps the canonical grid view by default and exposes a list view toggle', async () => {
    const result = renderWithLocale(<SeekerSaved locale="en" session={session} load={async () => list} actions={emptyActions()} />, { locale: 'en' });
    await waitFor(() => expect(screen.getByTestId(`seeker-saved-property-${saved.id}`)).toBeInTheDocument());
    const grid = result.container.querySelector('.seeker-saved__grid');
    expect(grid).toHaveAttribute('data-view', 'grid');
    fireEvent.click(screen.getByRole('button', { name: 'List view' }));
    expect(grid).toHaveAttribute('data-view', 'list');
  });

  it('renders the truthful empty state and fails closed for an anonymous session', () => {
    const copy = getSeekerSavedCopy('en');
    const empty = favoriteListDataSchema.parse({ items: [], page: 1, limit: 20, total: 0 });
    const result = renderWithLocale(<SeekerSaved locale="en" session={session} load={async () => empty} actions={emptyActions()} />, { locale: 'en' });
    return waitFor(async () => {
      expect(screen.getByRole('heading', { name: copy.empty.title, level: 2 })).toBeInTheDocument();
      result.unmount();
      renderWithLocale(<SeekerSaved locale="en" session={{ status: 'anonymous' }} load={async () => list} actions={emptyActions()} />, { locale: 'en' });
      expect(screen.getByRole('heading', { name: copy.states.permission.title })).toBeInTheDocument();
    });
  });
});

function emptyActions(): SeekerFavoriteActions & { readonly save: ReturnType<typeof vi.fn>; readonly remove: ReturnType<typeof vi.fn> } {
  return {
    save: vi.fn().mockResolvedValue({ saved: true, alreadySaved: false, item: saved } as FavoriteSaveData),
    remove: vi.fn().mockResolvedValue({ removed: true } as FavoriteRemoveData)
  };
}
