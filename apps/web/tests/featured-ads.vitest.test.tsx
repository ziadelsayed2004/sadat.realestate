import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { AdBanner, FeaturedOptions } from '@sadat-real-estate/contracts';
import { FeaturedEditor } from '../src/features/admin_featured/views.tsx';
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
    expect(source.updateBanner).toHaveBeenNthCalledWith(1, bannerId, expect.objectContaining({ title: { ar: 'الإعلان', en: 'Edited title' } }));
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
