import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { BannerDraftPreview } from '../src/features/admin_home/banner-draft-preview.tsx';
import { bannerFileKey } from '../src/features/admin_home/banner-slide-editor.tsx';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it('replaces uploaded files with saved images without indexing a removed file or mixing slide text', () => {
  vi.spyOn(URL, 'createObjectURL').mockImplementation(blob => `blob:${(blob as File).name}`);
  const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  const first = new File(['one'], 'one.png'), second = new File(['two'], 'two.png');
  const props = { locale: 'en' as const, title: { en: 'Banner' }, body: { en: 'Body' }, keepOriginal: false, drafts: { [bannerFileKey(first)]: { title: { en: 'First slide' } }, [bannerFileKey(second)]: { title: { en: 'Second slide' } } } };
  const view = render(<BannerDraftPreview {...props} files={[first, second]} images={[]} />);
  expect(screen.getByRole('heading', { name: 'First slide' })).toBeInTheDocument();
  view.rerender(<BannerDraftPreview {...props} files={[second]} images={[]} />);
  expect(screen.getByRole('heading', { name: 'Second slide' })).toBeInTheDocument();
  view.rerender(<BannerDraftPreview {...props} files={[]} images={[{ id: 'saved', url: '/saved.png' }]} />);
  expect(view.container.querySelector('.admin-home__draft-preview-frame img')).toHaveAttribute('src', '/saved.png');
  expect(revoke).toHaveBeenCalledWith('blob:one.png');
  expect(revoke).toHaveBeenCalledWith('blob:two.png');
});
