import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { AdBanner, FeaturedOptions } from '@sadat-real-estate/contracts';
import { FeaturedEditor, AdminFeatured } from '../src/features/admin_featured/views.tsx';
import { FeaturedPreview } from '../src/features/admin_featured/preview.tsx';
import { featuredOrder } from '../src/features/admin_featured/order.ts';
import { adBannerOrderSchema } from '@sadat-real-estate/contracts';
import { FeaturedCard } from '../src/features/public/featured-card.tsx';
import type { AdminHomeSource } from '../src/features/admin_home/data.ts';
import { renderWithLocale } from '../src/features/testing/index.ts';

const providerId = '1'.repeat(24), propertyId = '2'.repeat(24), bannerId = '3'.repeat(24), mediaId = '4'.repeat(24);
const options: FeaturedOptions = { canManage: true, advertisers: [{ id: providerId, name: { ar: 'شركة حقيقية', en: 'Actual company' }, verified: true }], destinations: [{ id: propertyId, kind: 'property', name: { ar: 'العقار المنشور', en: 'Published property' }, href: '/properties/owned-property' }] };
const item: AdBanner = { id: bannerId, placementKey: 'homepage.featured', featured: { advertiserProviderId: providerId, destination: { kind: 'property', id: propertyId }, highlight: { en: 'From 220 sqm' }, installment: { en: '10% down payment' }, ctaLabel: { en: 'Explore property' } }, title: { ar: 'الإعلان', en: 'Original title' }, body: { en: 'Original description' }, displaySeconds: 6, mediaIds: [mediaId], status: 'draft', sortOrder: 0, version: 0, startAt: '2020-01-01T00:00:00Z', endAt: '2099-01-01T00:00:00Z', createdBy: '5'.repeat(24), updatedBy: '5'.repeat(24), createdAt: '2026-10-10T00:00:00Z', updatedAt: '2026-10-10T00:00:00Z' };
function sourceFor(failUpload = false) {
  let current = structuredClone(item); const calls: string[] = [];
  const source = {
    previewBanner: vi.fn(async () => ({ banner: current, preview: true, mediaItems: [], media: { url: '/saved-image.png' } })),
    loadMediaPreview: vi.fn(async (url: string) => url),
    uploadBannerImage: vi.fn(async () => { calls.push('upload'); if (failUpload) throw new Error('Upload failed'); return { id: '6'.repeat(24), url: '/uploaded-image.png' }; }),
    updateBanner: vi.fn(async (_id: string, input: Partial<AdBanner>) => { calls.push(input.status === 'active' ? 'publish' : input.mediaIds ? 'image' : 'text'); current = { ...current, ...input, version: current.version + 1 }; return current; })
  } as unknown as AdminHomeSource;
  return { source, calls };
}
describe('Featured homepage advertising', () => {
  it('reorders imported cards with tied positions using unique orders and original optimistic versions', () => {
    const tied = [item, { ...item, id: 'a'.repeat(24), version: 3 }, { ...item, id: 'b'.repeat(24), version: 7 }];
    const order = adBannerOrderSchema.parse(featuredOrder(tied, 2, -1, 1));
    expect(order.items).toEqual([{ bannerId: item.id, sortOrder: 0, expectedVersion: 0 }, { bannerId: tied[2]!.id, sortOrder: 1, expectedVersion: 7 }, { bannerId: tied[1]!.id, sortOrder: 2, expectedVersion: 3 }]);
    expect(featuredOrder(tied, 0, -1, 1)).toBeUndefined();
    expect(featuredOrder(tied, 2, 1, 1)).toBeUndefined();
  });

  it.each(['ar', 'en'] as const)('provides a read-only preview of unlinked drafts without saving or fabricating identity in %s', async locale => {
    const { source } = sourceFor();
    const unlinked = { ...item, featured: { highlight: { en: 'Legacy offer' } } };
    vi.mocked(source.previewBanner).mockResolvedValue({ banner: unlinked, preview: true, media: { id: mediaId, bannerId, url: '/legacy.png', mime: 'image/png', width: 800, height: 400, active: true, version: 0, createdBy: '5'.repeat(24), createdAt: item.createdAt, updatedAt: item.updatedAt } });
    renderWithLocale(<FeaturedPreview item={unlinked} options={options} loadOptions={async () => options} source={source} locale={locale} onClose={() => {}} />, { locale });
    expect(await screen.findByRole('heading', { name: locale === 'ar' ? 'الإعلان' : 'Original title' })).toBeVisible();
    await waitFor(() => expect(document.querySelector('.admin-featured__preview img')).toHaveAttribute('src', '/legacy.png'));
    expect(screen.getByText(locale === 'ar' ? 'عارض عقار' : 'Property advertiser')).toBeVisible();
    expect(screen.queryByLabelText(locale === 'ar' ? 'موثق' : 'Verified')).toBeNull();
    expect(screen.queryByLabelText('Advertiser account')).toBeNull();
    expect(source.updateBanner).not.toHaveBeenCalled();
  });

  it.each(['ar', 'en'] as const)('opens edit and preview separately, preserves draft visibility and links only the published card in %s', async locale => {
    const { source } = sourceFor();
    const published = { ...item, id: 'a'.repeat(24), status: 'active' as const, publiclyVisible: true, title: { ar: 'منشور', en: 'Live ad' } };
    Object.assign(source, { loadBanners: vi.fn(async () => ({ items: [item, published], total: 2, page: 1, limit: 100 })) });
    const view = renderWithLocale(<AdminFeatured locale={locale} session={{ status: 'authenticated', role: 'admin' }} source={source} loadOptions={async () => options} />, { locale });
    const draftRow = await screen.findByTestId(`featured-row-${item.id}`);
    const liveRow = screen.getByTestId(`featured-row-${published.id}`);
    const siteLabel = locale === 'ar' ? 'عرض في الموقع' : 'View on site';
    expect(within(draftRow).getByRole('button', { name: siteLabel })).toBeDisabled();
    expect(await within(liveRow).findByRole('link', { name: siteLabel })).toHaveAttribute('href', `/?lang=${locale}&featuredAd=${published.id}#homepage-featured`);
    fireEvent.click(within(draftRow).getByRole('button', { name: locale === 'ar' ? 'معاينة' : 'Preview' }));
    expect(await screen.findByRole('region', { name: locale === 'ar' ? 'معاينة الإعلان المميز' : 'Featured ad preview' })).toBeVisible();
    expect(view.container.querySelector('.admin-featured__work-panel')).toHaveFocus();
    expect(screen.queryByRole('region', { name: locale === 'ar' ? 'تعديل الإعلان المميز' : 'Featured ad editor' })).toBeNull();
    fireEvent.click(within(draftRow).getByRole('button', { name: locale === 'ar' ? 'تعديل' : 'Edit' }));
    expect(await screen.findByRole('region', { name: locale === 'ar' ? 'تعديل الإعلان المميز' : 'Featured ad editor' })).toBeVisible();
    expect(screen.queryByRole('region', { name: locale === 'ar' ? 'معاينة الإعلان المميز' : 'Featured ad preview' })).toBeNull();
    expect(source.updateBanner).not.toHaveBeenCalled();
  });
  it.each(['ar', 'en'] as const)('explains eligibility for every approved provider type in %s', locale => {
    renderWithLocale(<FeaturedEditor options={options} loadOptions={async () => options} source={sourceFor().source} locale={locale} onSaved={() => {}} onClose={() => {}} />, { locale });
    expect(document.getElementById('featured-account-hint')).toHaveTextContent(locale === 'ar' ? 'المزود الفردي، والمكاتب، والشركات' : 'individuals, offices and developers');
  });
  it.each(['ar', 'en'] as const)('retries a failed image preview without clearing edited fields or saving content in %s', async locale => {
    const { source } = sourceFor();
    vi.mocked(source.loadMediaPreview).mockRejectedValueOnce(new Error('Unavailable')).mockResolvedValueOnce('/restored-image.png');
    renderWithLocale(<FeaturedEditor item={item} options={options} loadOptions={async () => options} source={source} locale={locale} onSaved={() => {}} onClose={() => {}} />, { locale });
    await screen.findByRole('alert');
    fireEvent.change(screen.getByDisplayValue('Original title'), { target: { value: 'My unsaved changes' } });
    fireEvent.click(screen.getByRole('button', { name: locale === 'ar' ? 'إعادة تحميل المعاينة' : 'Reload preview' }));
    await waitFor(() => expect(document.querySelector('.admin-featured__preview img')).toHaveAttribute('src', '/restored-image.png'));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByDisplayValue('My unsaved changes')).toBeInTheDocument();
    expect(source.updateBanner).not.toHaveBeenCalled();
  });

  it('releases a preview URL that finishes loading after the editor closes', async () => {
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    let finish!: (url: string) => void;
    const { source } = sourceFor();
    vi.mocked(source.loadMediaPreview).mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    const view = renderWithLocale(<FeaturedEditor item={item} options={options} loadOptions={async () => options} source={source} locale="en" onSaved={() => {}} onClose={() => {}} />, { locale: 'en' });
    await waitFor(() => expect(source.loadMediaPreview).toHaveBeenCalled());
    view.unmount(); finish('blob:closed-editor');
    await waitFor(() => expect(revoke).toHaveBeenCalledWith('blob:closed-editor'));
  });
  it('selects the sole eligible account and loads its pages automatically', async () => {
    const loadOptions = vi.fn(async () => options);
    renderWithLocale(<FeaturedEditor options={options} loadOptions={loadOptions} source={sourceFor().source} locale="en" onSaved={() => {}} onClose={() => {}} />, { locale: 'en' });
    expect(screen.getByLabelText('Advertiser account')).toHaveValue(providerId);
    await screen.findByRole('option', { name: 'Published property' });
    expect(loadOptions).toHaveBeenCalledWith(providerId);
  });
  it.each(['ar', 'en'] as const)('validates an unselected account in the page language rather than a browser popup (%s)', async locale => {
    const choices = { ...options, advertisers: [...options.advertisers, { id: 'b'.repeat(24), name: { en: 'Other company' }, verified: true }] };
    const { source } = sourceFor();
    renderWithLocale(<FeaturedEditor options={choices} loadOptions={async () => choices} source={source} locale={locale} onSaved={() => {}} onClose={() => {}} />, { locale });
    expect(screen.getByLabelText(locale === 'ar' ? 'المعلن من حسابات المنصة' : 'Advertiser account')).toHaveValue('');
    const form = document.querySelector('form')!;
    expect(form.noValidate).toBe(true);
    fireEvent.submit(form);
    expect(await screen.findByRole('alert')).toHaveTextContent(locale === 'ar' ? 'راجع الحساب' : 'Check advertiser');
    expect(source.updateBanner).not.toHaveBeenCalled();
  });
  it('removes the previous account pages while another account is loading', async () => {
    const other = 'b'.repeat(24);
    const choices = { ...options, advertisers: [...options.advertisers, { id: other, name: { en: 'Other company' }, verified: true }] };
    let finish: (value: FeaturedOptions) => void = () => {};
    const pending = new Promise<FeaturedOptions>(resolve => { finish = resolve; });
    renderWithLocale(<FeaturedEditor item={item} options={choices} loadOptions={async id => id === other ? pending : choices} source={sourceFor().source} locale="en" onSaved={() => {}} onClose={() => {}} />, { locale: 'en' });
    await screen.findByRole('option', { name: 'Published property' });
    fireEvent.change(screen.getByLabelText('Advertiser account'), { target: { value: other } });
    await waitFor(() => expect(screen.queryByRole('option', { name: 'Published property' })).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Save and publish' })).toBeDisabled();
    finish({ ...choices, destinations: [{ kind: 'property', id: 'c'.repeat(24), name: { en: 'Other property' }, href: '/properties/other' }] });
    await screen.findByRole('option', { name: 'Other property' });
    expect(screen.queryByRole('option', { name: 'Published property' })).not.toBeInTheDocument();
  });
  it('selects the canonical account when editing a legacy application-linked card', async () => {
    const alias = 'a'.repeat(24);
    const choices = { ...options, advertisers: options.advertisers.map(value => ({ ...value, aliases: [alias] })) };
    const loadOptions = vi.fn(async () => choices);
    renderWithLocale(<FeaturedEditor item={{ ...item, featured: { ...item.featured, advertiserProviderId: alias } }} options={choices} loadOptions={loadOptions} source={sourceFor().source} locale="en" onSaved={() => {}} onClose={() => {}} />, { locale: 'en' });
    expect(screen.getByLabelText('Advertiser account')).toHaveValue(providerId);
    await screen.findByRole('option', { name: 'Published property' });
    expect(loadOptions).toHaveBeenCalledWith(providerId);
  });
  it.each(['ar', 'en'] as const)('explains unavailable advertisers and links to account management in %s', locale => {
    renderWithLocale(<FeaturedEditor options={{ canManage: true, advertisers: [], destinations: [] }} loadOptions={async () => options} source={sourceFor().source} locale={locale} onSaved={() => {}} onClose={() => {}} />, { locale });
    expect(screen.getByRole('status')).toHaveTextContent(locale === 'ar' ? 'لا توجد حسابات' : 'No eligible advertisers');
    expect(screen.getByRole('link', { name: locale === 'ar' ? 'إدارة مقدمي العقارات' : 'Manage providers' })).toHaveAttribute('href', `/admin/providers?lang=${locale}`);
    expect(screen.getByLabelText(locale === 'ar' ? 'المعلن من حسابات المنصة' : 'Advertiser account')).toBeDisabled();
    expect(screen.getByRole('button', { name: locale === 'ar' ? 'حفظ ونشر' : 'Save and publish' })).toBeDisabled();
  });
  it('saves edited text and uploaded image before publishing in one click', async () => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:local-preview'); vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const { source, calls } = sourceFor();
    renderWithLocale(<FeaturedEditor item={item} options={options} loadOptions={async () => options} source={source} locale="en" onSaved={() => {}} onClose={() => {}} />, { locale: 'en' });
    await screen.findByRole('option', { name: 'Published property' });
    fireEvent.change(screen.getByDisplayValue('Original title'), { target: { value: 'Edited title' } });
    const file = new File(['image'], 'new-image.png', { type: 'image/png' });
    fireEvent.change(screen.getByLabelText('Ad image'), { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: 'Save and publish' }));
    await waitFor(() => expect(calls).toEqual(['text', 'upload', 'image', 'publish']));
    expect(source.updateBanner).toHaveBeenLastCalledWith(bannerId, expect.objectContaining({ status: 'active', expectedVersion: 2 }));
    expect(source.updateBanner).toHaveBeenNthCalledWith(1, bannerId, expect.objectContaining({ title: { ar: 'الإعلان', en: 'Edited title' }, displaySeconds: 10 }));
    expect(screen.getAllByText('Edited title').length).toBeGreaterThan(0);
  });
  it('keeps the selected image and all typed text after an upload failure, and never publishes', async () => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:local-preview'); vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const { source, calls } = sourceFor(true);
    renderWithLocale(<FeaturedEditor item={item} options={options} loadOptions={async () => options} source={source} locale="en" onSaved={() => {}} onClose={() => {}} />, { locale: 'en' });
    await screen.findByRole('option', { name: 'Published property' });
    fireEvent.change(screen.getByDisplayValue('Original title'), { target: { value: 'Kept title' } });
    const file = new File(['image'], 'retry-image.png', { type: 'image/png' });
    fireEvent.change(screen.getByLabelText('Ad image'), { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: 'Save and publish' }));
    await screen.findByRole('alert');
    expect(screen.getByDisplayValue('Kept title')).toBeInTheDocument();
    expect((screen.getByLabelText('Ad image') as HTMLInputElement).files?.[0]).toBe(file);
    expect(calls).toEqual(['text', 'upload']);
  });
  it.each(['ar', 'en'] as const)('renders actual advertiser identity and saved creative fields in %s', locale => {
    renderWithLocale(<FeaturedCard locale={locale} banner={{ key: 'featured_test', order: 0, title: { ar: 'عنوان حقيقي', en: 'Actual title' }, highlight: { ar: '٢٢٠ متر', en: '220 sqm' }, installment: { ar: 'مقدم ١٠٪', en: '10% deposit' }, advertiserName: { ar: 'شركة حقيقية', en: 'Actual company' }, advertiserVerified: true, targetUrl: '/properties/owned-property', ctaLabel: { ar: 'افتح العقار', en: 'Open property' } }} />, { locale });
    expect(screen.getByLabelText(locale === 'ar' ? 'موثق' : 'Verified')).toBeInTheDocument();
    expect(screen.getByRole('link').getAttribute('href')).toContain('/properties/owned-property');
    expect(screen.getByText(locale === 'ar' ? 'مقدم ١٠٪' : '10% deposit')).toBeInTheDocument();
  });
  it('never fabricates a verified advertiser or permits an external destination in a preview', () => {
    renderWithLocale(<FeaturedCard locale="en" banner={{ key: 'legacy_draft', order: 0, title: { en: 'Unlinked draft' }, advertiserVerified: true, targetUrl: 'https://outside.invalid' }} />, { locale: 'en' });
    expect(screen.getByText('Property advertiser')).toBeInTheDocument();
    expect(screen.queryByLabelText('Verified')).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
