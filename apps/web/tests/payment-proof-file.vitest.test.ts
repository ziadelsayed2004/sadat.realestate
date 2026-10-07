import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadAdminPaymentProofFile } from '../src/features/admin_ads/data.ts';
import { ApiClientError } from '../src/features/contracts/index.ts';

const id = 'a'.repeat(24);
afterEach(() => vi.unstubAllGlobals());
describe('Authenticated payment proof file loading', () => {
  it('refreshes an expired session once and sends the new bearer only in the headers', async () => {
    let token = 'Bearer expired';
    const fetch = vi.fn().mockResolvedValueOnce(new Response('', { status: 401 })).mockResolvedValueOnce(new Response('receipt bytes', { headers: { 'content-type': 'image/png' } }));
    vi.stubGlobal('fetch', fetch);
    const refresh = vi.fn(async () => { token = 'Bearer refreshed'; });
    const controller = new AbortController();
    const blob = await loadAdminPaymentProofFile(id, { authorization: { getAuthorizationHeader: () => token, refresh }, signal: controller.signal });
    expect(await blob.text()).toBe('receipt bytes');
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls[0]?.[0]).toBe(`/api/v1/admin/payment-proofs/${id}/file`);
    expect(fetch.mock.calls[0]?.[1]).toMatchObject({ headers: { authorization: 'Bearer expired' }, credentials: 'include', cache: 'no-store', signal: controller.signal });
    expect(fetch.mock.calls[1]?.[1]).toMatchObject({ headers: { authorization: 'Bearer refreshed' } });
  });
  it('reports permission failures without attempting to display an error response as an image', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 403 })));
    await expect(loadAdminPaymentProofFile(id)).rejects.toMatchObject({ status: 403, code: 'HTTP_ERROR' });
  });
  it('rejects unsupported and empty files', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(new Response('<svg/>', { headers: { 'content-type': 'image/svg+xml' } })).mockResolvedValueOnce(new Response('', { headers: { 'content-type': 'image/png' } }));
    vi.stubGlobal('fetch', fetch);
    await expect(loadAdminPaymentProofFile(id)).rejects.toBeInstanceOf(ApiClientError);
    await expect(loadAdminPaymentProofFile(id)).rejects.toBeInstanceOf(ApiClientError);
  });
});
