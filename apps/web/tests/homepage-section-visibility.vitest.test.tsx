import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { cmsAdminContentDataSchema, type CmsAdminHomepageSection, type SupportedLocale } from '@sadat-real-estate/contracts';
import { AdminHome, createAdminHomeSource } from '../src/features/admin_home/index.ts';
import { ApiClientError } from '../src/features/contracts/index.ts';
import { renderWithLocale } from '../src/features/testing/index.ts';

const item: CmsAdminHomepageSection = {
  id: 'd'.repeat(24), key: 'hero', title: { ar: 'عنواني', en: 'My title' },
  body: { ar: 'محتواي', en: 'My content' }, order: 2, status: 'published', visible: true,
  version: 4, updatedBy: 'c'.repeat(24), updatedAt: '2026-10-09T08:00:00.000Z', availableActions: ['update', 'publish', 'deactivate']
};
function content(row = item) {
  const data = cmsAdminContentDataSchema.parse({ namespace: 'homepage', items: [row] });
  if (data.namespace !== 'homepage') throw new Error('Expected homepage content');
  return data;
}
function setup(locale: SupportedLocale, row = item) {
  let stored = row;
  const updateContent = vi.fn(async (_namespace: unknown, input: unknown) => {
    const changes = input as CmsAdminHomepageSection;
    stored = { ...stored, status: changes.status, visible: changes.visible, version: stored.version + 1 };
    return content(stored);
  });
  const source = { ...createAdminHomeSource(), updateContent };
  renderWithLocale(<AdminHome url="/admin/content/homepage" locale={locale} session={{ status: 'authenticated', role: 'admin' }} source={source} initialContent={content(row)} />, { locale });
  return updateContent;
}

describe('homepage section display controls', () => {
  it.each(['ar', 'en'] as const)('stops and resumes a section using the latest server version in %s', async locale => {
    const update = setup(locale);
    const row = within(screen.getByTestId(`admin-home-homepage-${item.id}`));
    fireEvent.click(row.getByRole('button', { name: locale === 'ar' ? 'إيقاف' : 'Stop' }));
    const form = within(screen.getByTestId('homepage-section-visibility'));
    fireEvent.click(form.getByRole('button', { name: locale === 'ar' ? 'إيقاف' : 'Stop' }));
    expect(update).not.toHaveBeenCalled();
    fireEvent.change(form.getByRole('textbox'), { target: { value: 'Hide until content is ready' } });
    fireEvent.click(form.getByRole('button', { name: locale === 'ar' ? 'إيقاف' : 'Stop' }));
    await waitFor(() => expect(row.getByText(locale === 'ar' ? 'مخفي عن الزوار' : 'Hidden from visitors')).toBeInTheDocument());
    expect(update).toHaveBeenNthCalledWith(1, 'homepage', { id: item.id, version: 4, order: 2, status: 'inactive', visible: false, reason: 'Hide until content is ready' });
    expect(row.getByText(item.title[locale]!)).toBeInTheDocument();
    fireEvent.click(row.getByRole('button', { name: locale === 'ar' ? 'إعادة تشغيل' : 'Resume' }));
    fireEvent.change(screen.getByTestId('homepage-section-visibility').querySelector('textarea')!, { target: { value: 'Content is ready again' } });
    fireEvent.click(within(screen.getByTestId('homepage-section-visibility')).getByRole('button', { name: locale === 'ar' ? 'إعادة تشغيل' : 'Resume' }));
    await waitFor(() => expect(row.getByText(locale === 'ar' ? 'ظاهر للزوار' : 'Visible to visitors')).toBeInTheDocument());
    expect(update).toHaveBeenNthCalledWith(2, 'homepage', { id: item.id, version: 5, order: 2, status: 'published', visible: true, reason: 'Content is ready again' });
  });

  it('keeps the section unchanged and preserves the reason after a version conflict', async () => {
    const update = setup('en');
    update.mockRejectedValueOnce(new ApiClientError('errors.conflict', { status: 409, code: 'HTTP_ERROR' }));
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
    const form = within(screen.getByTestId('homepage-section-visibility'));
    fireEvent.change(form.getByRole('textbox'), { target: { value: 'Hold for next week' } });
    fireEvent.click(form.getByRole('button', { name: 'Stop' }));
    await waitFor(() => expect(form.getByRole('alert')).toHaveTextContent('Reload the page'));
    expect(form.getByRole('textbox')).toHaveValue('Hold for next week');
    expect(screen.getByText('Visible to visitors')).toBeInTheDocument();
    fireEvent.click(form.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByTestId('homepage-section-visibility')).toBeNull();
  });

  it('uses server permissions for stopping and treats a published hidden section as stopped', () => {
    setup('en', { ...item, visible: false, availableActions: ['update'] });
    expect(screen.getByText('Hidden from visitors')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Stop|Resume|Publish/u })).toBeNull();
  });
});
