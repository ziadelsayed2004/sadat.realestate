import { fireEvent, screen, waitFor } from '@testing-library/react';
import { propertyDataSchema } from '@sadat-real-estate/contracts';
import { afterEach, expect, it, vi } from 'vitest';
import { AdminPropertyEditor } from '../src/features/admin_properties/editor.tsx';
import { renderWithLocale } from '../src/features/testing/index.ts';

const property = propertyDataSchema.parse({ id: 'a'.repeat(24), kind: 'property', name: { en: 'Published villa', ar: 'فيلا منشورة' }, slug: 'published-villa', transactionType: 'sale', source: { providerId: 'b'.repeat(24), sourceType: 'individual_broker' }, status: 'published', active: true, version: 3, createdAt: '2026-10-08T10:00:00Z', updatedAt: '2026-10-08T10:00:00Z', availableActions: ['update'] });
const authorization = { getAuthorizationHeader: () => 'Bearer admin.editor.test' };
const response = (data: unknown) => new Response(JSON.stringify({ data, meta: { requestId: 'editor-test' } }), { headers: { 'content-type': 'application/json' } });
afterEach(() => vi.unstubAllGlobals());

it('keeps failed title edits, uses the current version, and sends only the selected administrative step', async () => {
  let attempts = 0;
  const bodies: Record<string, unknown>[] = [];
  const fetcher = vi.fn<typeof fetch>(async (_input, init) => {
    expect(new Headers(init?.headers).get('authorization')).toBe('Bearer admin.editor.test');
    if (!init?.method || init.method === 'GET') return response({ items: [] });
    bodies.push(JSON.parse(String(init.body)));
    if (++attempts === 1) return new Response(JSON.stringify({ error: { code: 'SERVICE_UNAVAILABLE', messageKey: 'errors.serviceUnavailable', requestId: 'editor-test', details: [] } }), { status: 503, headers: { 'content-type': 'application/json' } });
    return response({ ...property, name: bodies.at(-1)?.name, version: 4 });
  });
  vi.stubGlobal('fetch', fetcher);
  const saved = vi.fn();
  renderWithLocale(<AdminPropertyEditor initialProperty={property} locale="en" authorization={authorization} onSaved={saved} />, { locale: 'en' });
  fireEvent.change(screen.getByLabelText('Edit reason'), { target: { value: 'Correct property title' } });
  fireEvent.change(screen.getByLabelText('Property title EN'), { target: { value: 'Updated villa' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('entries are preserved'));
  expect(screen.getByLabelText('Property title EN')).toHaveValue('Updated villa');
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
  await waitFor(() => expect(saved).toHaveBeenCalledWith(expect.objectContaining({ status: 'published', version: 4 })));
  expect(bodies).toEqual([expect.objectContaining({ version: 3, name: { ar: 'فيلا منشورة', en: 'Updated villa' } }), expect.objectContaining({ version: 3 })]);
  expect(Object.keys(bodies[0]!).sort()).toEqual(['name', 'reason', 'version']);
});

it('removes a photo through the administrative route with a reason and does not render deleted media', async () => {
  const media = { id: 'c'.repeat(24), propertyId: property.id, kind: 'image', originalFilename: 'photo.jpg', detectedMime: 'image/jpeg', byteSize: 6, sha256: 'd'.repeat(64), sortOrder: 0, isCover: true, processingState: 'ready', active: true, version: 1, createdAt: property.createdAt, updatedAt: property.updatedAt };
  const fetcher = vi.fn<typeof fetch>(async (input, init) => {
    if (String(input).endsWith('/content')) return new Response('', { status: 404 });
    if (String(input).endsWith(property.id)) return response(property);
    if (!init?.method || init.method === 'GET') return response({ items: [media, { ...media, id: 'e'.repeat(24), originalFilename: 'deleted.jpg', active: false, processingState: 'deleted' }] });
    expect(String(input)).toContain(`/admin/properties/${property.id}/media/${media.id}`);
    expect(init.method).toBe('DELETE');
    expect(decodeURIComponent(new Headers(init.headers).get('x-edit-reason')!)).toBe('Remove outdated property photo');
    return response({ ...media, active: false, processingState: 'deleted' });
  });
  vi.stubGlobal('fetch', fetcher);
  renderWithLocale(<AdminPropertyEditor initialProperty={property} locale="en" authorization={authorization} onSaved={() => undefined} />, { locale: 'en' });
  await screen.findByRole('button', { name: /^Remove$/ });
  expect(screen.queryByText('deleted.jpg')).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Edit reason'), { target: { value: 'Remove outdated property photo' } });
  fireEvent.click(screen.getByRole('button', { name: /^Remove$/ }));
  await waitFor(() => expect(screen.queryByRole('button', { name: /^Remove$/ })).not.toBeInTheDocument());
});

it('validates all changed fields before writing and resumes a partial save with the latest version', async () => {
  let current = { ...property, price: { amount: 1000, currency: 'EGP' } };
  let failDetails = true;
  const writes: { step: string; body: Record<string, unknown> }[] = [];
  vi.stubGlobal('fetch', vi.fn<typeof fetch>(async (input, init) => {
    if (init?.method !== 'PATCH') return response({ items: [] });
    const step = String(input).split('/').at(-1)!;
    const body = JSON.parse(String(init.body)); writes.push({ step, body });
    expect(body.version).toBe(current.version);
    if (step === 'details' && failDetails) { failDetails = false; return new Response('', { status: 503 }); }
    const changes = { ...body }; delete changes.version; delete changes.reason;
    current = { ...current, ...changes, version: current.version + 1 };
    return response(current);
  }));
  renderWithLocale(<AdminPropertyEditor initialProperty={current} locale="en" authorization={authorization} onSaved={() => undefined} />, { locale: 'en' });
  expect(screen.getAllByRole('button', { name: 'Save changes' })).toHaveLength(1);
  fireEvent.change(screen.getByLabelText('Edit reason'), { target: { value: 'Update villa information' } });
  fireEvent.change(screen.getByLabelText('Property title EN'), { target: { value: 'Updated villa' } });
  fireEvent.change(screen.getByLabelText('Property description EN'), { target: { value: 'New description' } });
  fireEvent.change(screen.getByLabelText('Price'), { target: { value: '-1' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Check price'));
  expect(writes).toHaveLength(0);
  fireEvent.change(screen.getByLabelText('Price'), { target: { value: '2000' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Some changes were saved'));
  expect(current.version).toBe(4);
  expect(screen.getByLabelText('Property description EN')).toHaveValue('New description');
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Changes saved'));
  expect(writes.map(write => [write.step, write.body.version])).toEqual([['basic', 3], ['details', 4], ['details', 4], ['price-payment', 5]]);
  expect(current).toMatchObject({ version: 6, status: 'published', price: { amount: 2000 }, name: { en: 'Updated villa' } });
});

it('explains a missing reason immediately without sending changes', async () => {
  const fetcher = vi.fn<typeof fetch>(async () => response({ items: [] }));
  vi.stubGlobal('fetch', fetcher);
  renderWithLocale(<AdminPropertyEditor initialProperty={property} locale="en" authorization={authorization} onSaved={() => undefined} />, { locale: 'en' });
  fireEvent.change(screen.getByLabelText('Property title EN'), { target: { value: 'Updated villa' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Enter an edit reason'));
  expect(fetcher.mock.calls.every(([, init]) => init?.method !== 'PATCH')).toBe(true);
});
