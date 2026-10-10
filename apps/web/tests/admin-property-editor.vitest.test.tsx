import { fireEvent, screen, waitFor } from '@testing-library/react';
import { propertyDataSchema } from '@sadat-real-estate/contracts';
import { afterEach, expect, it, vi } from 'vitest';
import { AdminPropertyEditor } from '../src/features/admin_properties/editor.tsx';
import { AdminPropertyCover } from '../src/features/admin_properties/photo.tsx';
import { renderWithLocale } from '../src/features/testing/index.ts';

const property = propertyDataSchema.parse({ id: 'a'.repeat(24), kind: 'property', name: { en: 'Published villa', ar: 'فيلا منشورة' }, slug: 'published-villa', transactionType: 'sale', source: { providerId: 'b'.repeat(24), sourceType: 'individual_broker' }, status: 'published', active: true, version: 3, createdAt: '2026-10-08T10:00:00Z', updatedAt: '2026-10-08T10:00:00Z', availableActions: ['update'] });
const authorization = { getAuthorizationHeader: () => 'Bearer admin.editor.test' };
const response = (data: unknown) => new Response(JSON.stringify({ data, meta: { requestId: 'editor-test' } }), { headers: { 'content-type': 'application/json' } });
afterEach(() => vi.unstubAllGlobals());

it('previews a non-public cover through authenticated admin media without requesting public bytes', async () => {
  const fetcher = vi.fn<typeof fetch>(async () => new Response('', { status: 403 }));
  vi.stubGlobal('fetch', fetcher);
  renderWithLocale(<AdminPropertyCover property={{ ...property, status: 'pending_review', imageUrl: `/api/v1/public/properties/${property.id}/media/${'c'.repeat(24)}/content` }} locale="en" authorization={authorization} />, { locale: 'en' });
  await screen.findByText('Image preview unavailable');
  expect(fetcher).toHaveBeenCalledTimes(1);
  const [url, init] = fetcher.mock.calls[0]!;
  expect(String(url)).toBe(`/api/v1/admin/properties/${property.id}/media/${'c'.repeat(24)}/content`);
  expect(new Headers(init?.headers).get('authorization')).toBe('Bearer admin.editor.test');
  expect(init?.credentials).toBe('include');
});

it('keeps short-reason validation visible and never writes until it is corrected or cleared', async () => {
  const fetcher = vi.fn<typeof fetch>(async () => response({ items: [] }));
  vi.stubGlobal('fetch', fetcher);
  renderWithLocale(<AdminPropertyEditor initialProperty={property} locale="en" authorization={authorization} onSaved={() => undefined} />, { locale: 'en' });
  fireEvent.change(screen.getByLabelText('Edit reason (optional)'), { target: { value: 'abc' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Use 5 characters or leave the reason blank'));
  expect(fetcher.mock.calls.some(([, init]) => init?.method === 'PATCH')).toBe(false);
});

it('queues media and uses the returned field version for the cover, without uploading successful files again on retry', async () => {
  const photo = { id: 'c'.repeat(24), propertyId: property.id, kind: 'image', originalFilename: 'old.jpg', detectedMime: 'image/jpeg', byteSize: 6, sha256: 'd'.repeat(64), sortOrder: 0, isCover: true, processingState: 'ready', active: true, version: 1, createdAt: property.createdAt, updatedAt: property.updatedAt };
  const second = { ...photo, id: 'e'.repeat(24), originalFilename: 'second.jpg', isCover: false, sortOrder: 1 };
  const files = [new File(['first'], 'first.png', { type: 'image/png' }), new File(['second'], 'second.png', { type: 'image/png' })];
  const uploaded: File[] = [];
  let fail = true;
  let current = property;
  const fetcher = vi.fn<typeof fetch>(async (input, init) => {
    if (String(input).endsWith('/content')) return new Response('', { status: 404 });
    if (init?.method === 'POST') {
      uploaded.push(init.body as File);
      if (init.body === files[1] && fail) { fail = false; return new Response('', { status: 503 }); }
      return response({ ...photo, id: init.body === files[0] ? '1'.repeat(24) : '2'.repeat(24), isCover: false });
    }
    if (init?.method === 'PATCH') {
      const body = JSON.parse(String(init.body));
      if (String(input).endsWith('/order')) { expect(body.version).toBe(4); expect(body.items[0].mediaId).toBe(second.id); return response({ items: [second] }); }
      current = { ...current, ...body, version: 4 }; delete (current as unknown as Record<string, unknown>).reason;
      return response(current);
    }
    if (String(input).endsWith(property.id)) return response(current);
    return response({ items: [photo, second] });
  });
  vi.stubGlobal('fetch', fetcher);
  renderWithLocale(<AdminPropertyEditor initialProperty={property} locale="en" authorization={authorization} onSaved={() => undefined} />, { locale: 'en' });
  const input = screen.getByLabelText('Add image (JPG / PNG, up to 10 MB)');
  await waitFor(() => expect(input).toBeEnabled());
  fireEvent.change(screen.getByLabelText('Property title EN'), { target: { value: 'Updated villa' } });
  fireEvent.click(screen.getAllByRole('button', { name: 'Use as cover' })[1]!);
  fireEvent.change(input, { target: { files } });
  expect(fetcher.mock.calls.some(([, init]) => ['POST', 'PATCH'].includes(init?.method ?? ''))).toBe(false);
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Some changes were saved'));
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Changes saved'));
  expect(uploaded).toEqual([files[0], files[1], files[1]]);
  expect(fetcher.mock.calls.filter(([url, init]) => init?.method === 'PATCH' && String(url).endsWith(property.id))).toHaveLength(1);
});

it('keeps failed title edits and retries the unified administrative save at the same version', async () => {
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
  fireEvent.change(screen.getByLabelText('Edit reason (optional)'), { target: { value: 'Correct property title' } });
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
  fireEvent.change(screen.getByLabelText('Edit reason (optional)'), { target: { value: 'Remove outdated property photo' } });
  fireEvent.click(screen.getByRole('button', { name: /^Remove$/ }));
  expect(fetcher.mock.calls.some(([, init]) => init?.method === 'DELETE')).toBe(false);
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Changes saved'));
  expect(screen.queryByRole('button', { name: /^Remove$/ })).not.toBeInTheDocument();
});

it('validates the whole editor and saves title, description, price and layout in one atomic request', async () => {
  let current = { ...property, price: { amount: 1000, currency: 'EGP' } };
  let fail = true;
  const writes: Record<string, unknown>[] = [];
  vi.stubGlobal('fetch', vi.fn<typeof fetch>(async (input, init) => {
    if (init?.method !== 'PATCH') return response({ items: [] });
    expect(String(input)).toBe(`/api/v1/admin/properties/${property.id}`);
    const body = JSON.parse(String(init.body)); writes.push(body);
    expect(body.version).toBe(current.version);
    if (fail) { fail = false; return new Response('', { status: 503 }); }
    const changes = { ...body }; delete changes.version; delete changes.reason;
    current = { ...current, ...changes, version: current.version + 1 };
    return response(current);
  }));
  renderWithLocale(<AdminPropertyEditor initialProperty={current} locale="en" authorization={authorization} onSaved={() => undefined} />, { locale: 'en' });
  expect(screen.getAllByRole('button', { name: 'Save changes' })).toHaveLength(1);
  fireEvent.change(screen.getByLabelText('Property title EN'), { target: { value: 'Updated villa' } });
  fireEvent.change(screen.getByLabelText('Property description EN'), { target: { value: 'New description' } });
  fireEvent.change(screen.getByLabelText('Area in square meters'), { target: { value: '145' } });
  fireEvent.change(screen.getByLabelText('Bedrooms'), { target: { value: '3' } });
  fireEvent.change(screen.getByLabelText('Bathrooms'), { target: { value: '2' } });
  fireEvent.change(screen.getByLabelText('Floor'), { target: { value: '4' } });
  fireEvent.change(screen.getByLabelText('Building floors'), { target: { value: '9' } });
  fireEvent.change(screen.getByLabelText('Price'), { target: { value: '-1' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Check price'));
  expect(writes).toHaveLength(0);
  fireEvent.change(screen.getByLabelText('Price'), { target: { value: '2000' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('entries are preserved'));
  expect(current.version).toBe(3);
  expect(screen.getByLabelText('Property description EN')).toHaveValue('New description');
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Changes saved'));
  expect(screen.getByRole('status')).toHaveFocus();
  expect(writes.map(write => write.version)).toEqual([3, 3]);
  expect(current).toMatchObject({ version: 4, status: 'published', price: { amount: 2000 }, name: { en: 'Updated villa' }, area: { value: 145, unit: 'sqm' }, layout: { bedrooms: 3, bathrooms: 2, floor: 4, totalFloors: 9 } });
});

it('saves without a typed reason and records an automatic administrative edit reason', async () => {
  const fetcher = vi.fn<typeof fetch>(async (_input, init) => init?.method === 'PATCH' ? response({ ...property, name: { en: 'Updated villa' }, version: 4 }) : response({ items: [] }));
  vi.stubGlobal('fetch', fetcher);
  renderWithLocale(<AdminPropertyEditor initialProperty={property} locale="en" authorization={authorization} onSaved={() => undefined} />, { locale: 'en' });
  fireEvent.change(screen.getByLabelText('Property title EN'), { target: { value: 'Updated villa' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Changes saved'));
  const write = fetcher.mock.calls.find(([, init]) => init?.method === 'PATCH')!;
  expect(JSON.parse(String(write[1]?.body))).toMatchObject({ version: 3, reason: 'Administrative property edit', name: { en: 'Updated villa' } });
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

it('uploads a cover without a typed reason and refreshes the persisted public image URL', async () => {
  const media = { id: 'c'.repeat(24), propertyId: property.id, kind: 'image', originalFilename: 'new-cover.png', detectedMime: 'image/png', byteSize: 12, sha256: 'd'.repeat(64), sortOrder: 0, isCover: true, processingState: 'ready', active: true, version: 1, createdAt: property.createdAt, updatedAt: property.updatedAt };
  const imageUrl = `/api/v1/public/properties/${property.id}/media/${media.id}/content`;
  const saved = vi.fn();
  let uploads = 0;
  vi.stubGlobal('fetch', vi.fn<typeof fetch>(async (input, init) => {
    if (init?.method === 'POST') {
      uploads++;
      expect(String(input)).toBe(`/api/v1/admin/properties/${property.id}/media`);
      expect(decodeURIComponent(new Headers(init.headers).get('x-edit-reason')!)).toBe('Administrative property edit');
      expect(init.body).toBeInstanceOf(File);
      return response(media);
    }
    if (String(input).endsWith(property.id)) return response({ ...property, imageUrl });
    if (String(input).endsWith('/content')) return new Response('', { status: 404 });
    return response({ items: [] });
  }));
  renderWithLocale(<AdminPropertyEditor initialProperty={property} locale="en" authorization={authorization} onSaved={saved} />, { locale: 'en' });
  const input = screen.getByLabelText('Add image (JPG / PNG, up to 10 MB)');
  await waitFor(() => expect(input).toBeEnabled());
  fireEvent.change(input, { target: { files: [new File(['image bytes'], media.originalFilename, { type: 'image/png' })] } });
  expect(uploads).toBe(0);
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
  await waitFor(() => expect(saved).toHaveBeenCalledWith(expect.objectContaining({ imageUrl, status: 'published', active: true })));
  expect(uploads).toBe(1);
  expect(screen.getByText('Cover image')).toBeVisible();
});
