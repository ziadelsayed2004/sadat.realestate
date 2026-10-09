import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import AdminPropertyVideo from '../src/features/admin_properties/video.tsx';
import { renderWithLocale } from '../src/features/testing/index.ts';

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
const props = { propertyId: 'a'.repeat(24), mediaId: 'b'.repeat(24), filename: 'WhatsApp Video 2026-09-16 at 11.16.39 AM.mp4', locale: 'en' as const, authorization: { getAuthorizationHeader: () => 'Bearer admin.video.test' } };

it('loads video through the authorized private route and releases its blob when closed', async () => {
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:private-video');
  const revoke = vi.spyOn(URL, 'revokeObjectURL');
  const fetcher = vi.fn<typeof fetch>(async (input, init) => {
    expect(String(input)).toContain(`/admin/properties/${props.propertyId}/media/${props.mediaId}/content`);
    expect(new Headers(init?.headers).get('authorization')).toBe('Bearer admin.video.test');
    expect(init?.credentials).toBe('include');
    return new Response(new Blob(['video'], { type: 'video/mp4' }));
  });
  vi.stubGlobal('fetch', fetcher);
  const view = renderWithLocale(<AdminPropertyVideo {...props} />, { locale: 'en' });
  const player = await screen.findByLabelText(props.filename);
  expect(player).toHaveAttribute('src', 'blob:private-video');
  expect(player).toHaveAttribute('controls');
  expect(player).toHaveAttribute('playsinline');
  expect(player).not.toHaveAttribute('autoplay');
  expect(screen.getByRole('link', { name: 'Download video' })).toHaveAttribute('download', props.filename);
  fireEvent.error(player);
  expect(screen.getByRole('alert')).toHaveTextContent('Video could not play');
  expect(screen.getByRole('link', { name: 'Download video' })).toHaveAttribute('href', 'blob:private-video');
  view.unmount();
  expect(revoke).toHaveBeenCalledWith('blob:private-video');
});

it('shows an error without an unprotected link and retries the failed video request', async () => {
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:retried-video');
  const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(new Response('', { status: 403 })).mockResolvedValueOnce(new Response(new Blob(['video'], { type: 'video/mp4' })));
  vi.stubGlobal('fetch', fetcher);
  renderWithLocale(<AdminPropertyVideo {...props} />, { locale: 'en' });
  await screen.findByRole('alert');
  expect(screen.queryByRole('link')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Reload video' }));
  await waitFor(() => expect(screen.getByLabelText(props.filename)).toHaveAttribute('src', 'blob:retried-video'));
  expect(fetcher).toHaveBeenCalledTimes(2);
});
