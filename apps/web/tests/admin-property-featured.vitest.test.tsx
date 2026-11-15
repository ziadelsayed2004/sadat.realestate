import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FeaturedPropertyControl } from '../src/features/admin_properties/featured.tsx';
import { RouteShellAuthContext } from '../src/features/routing/shells.tsx';
import { propertyDataSchema } from '@sadat-real-estate/contracts';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const property = propertyDataSchema.parse({ id: 'a'.repeat(24), kind: 'property', name: { en: 'Property' }, slug: 'property', transactionType: 'sale', source: { providerId: 'b'.repeat(24), sourceType: 'individual_broker' }, status: 'published', active: true, featured: true, version: 3, createdAt: '2026-10-01T00:00:00.000Z', updatedAt: '2026-10-01T00:00:00.000Z', availableActions: ['update'] });

it('preserves the session method receiver for both reading and refreshing credentials', async () => {
  class Session {
    token = 'expired';
    getAuthorizationHeader() { return `Bearer ${this.token}`; }
    async refresh() { this.token = 'renewed'; }
  }
  const session = new Session(), onSaved = vi.fn();
  const saved = { ...property, featured: false, version: 4 };
  const headers: string[] = [];
  const bodies: unknown[] = [];
  vi.stubGlobal('fetch', vi.fn(async (_url: unknown, init: RequestInit) => {
    headers.push(new Headers(init.headers).get('authorization')!);
    bodies.push(JSON.parse(String(init.body)));
    return new Response(JSON.stringify(headers.length === 1 ? { error: { code: 'AUTHENTICATION_REQUIRED', messageKey: 'errors.authenticationRequired', details: [], requestId: 'expired' } } : { data: saved }), { status: headers.length === 1 ? 401 : 200, headers: { 'content-type': 'application/json' } });
  }));
  render(<RouteShellAuthContext.Provider value={session}><FeaturedPropertyControl property={property} locale="en" onSaved={onSaved} /></RouteShellAuthContext.Provider>);
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(screen.getByRole('button', { name: 'Save featured selection' }));
  await waitFor(() => expect(onSaved).toHaveBeenCalledWith(saved));
  expect(headers).toEqual(['Bearer expired', 'Bearer renewed']);
  expect(bodies).toEqual(Array(2).fill({ version: 3, featured: false, reason: 'Manage homepage featured property' }));
  expect(screen.getByRole('status')).toHaveTextContent('selection removed');
});

it.each([[403, 'permission'], [409, 'Reload this page'], [500, 'choice is retained']] as const)('retains the requested selection and explains a failed save (%s)', async (status, message) => {
  const onSaved = vi.fn();
  const fetcher = vi.fn(async () => new Response(JSON.stringify({ error: { code: 'REJECTED', messageKey: 'errors.conflict', details: [], requestId: 'denied' } }), { status, headers: { 'content-type': 'application/json' } }));
  vi.stubGlobal('fetch', fetcher);
  render(<FeaturedPropertyControl property={property} locale="en" onSaved={onSaved} />);
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(screen.getByRole('button', { name: 'Save featured selection' }));
  expect(await screen.findByRole('alert')).toHaveTextContent(message);
  expect(screen.getByRole('checkbox')).not.toBeChecked();
  expect(screen.getByRole('button')).toBeEnabled();
  expect(onSaved).not.toHaveBeenCalled();
  expect(fetcher).toHaveBeenCalledTimes(1);
});
