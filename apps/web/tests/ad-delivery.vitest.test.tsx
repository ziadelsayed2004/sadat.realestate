import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { adAdminRequestSchema, adBannerSchema, type SupportedLocale } from '@sadat-real-estate/contracts';
import { AdDeliveryActions } from '../src/features/admin_ads/delivery-actions.tsx';
import { BannerPlacementOptions } from '../src/features/admin_home/banner-placement-options.tsx';
import { createAdminHomeSource } from '../src/features/admin_home/data.ts';
import { renderWithLocale } from '../src/features/testing/index.ts';

const id = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const providerId = 'bbbbbbbbbbbbbbbbbbbbbbbb';
const bannerId = 'cccccccccccccccccccccccc';
const data = adAdminRequestSchema.parse({ request: { id, providerId, placementKey: 'search.sidebar', adType: 'property_promotion', contactPhone: '+201028514572', purpose: 'Promote apartment SDT-1234 in the First District', intervalStart: '2026-10-10T09:00:00Z', intervalEnd: '2026-10-20T09:00:00Z', status: 'scheduled', version: 1, createdAt: '2026-10-09T09:00:00Z', updatedAt: '2026-10-09T09:00:00Z' }, pricingOptions: { placements: [{ key: 'search.sidebar', label: { ar: 'بانر صفحة البحث', en: 'Search page banner' } }], adTypes: ['property_promotion'] } });
const banner = adBannerSchema.parse({ id: bannerId, adRequestId: id, placementKey: 'search.sidebar', title: { ar: 'شقة الحي الأول', en: 'First District apartment' }, targetUrl: 'https://elsadatrealestate.com/properties/demo-open-view-apartment', startAt: data.request.intervalStart, endAt: data.request.intervalEnd, status: 'scheduled', sortOrder: 0, version: 1, createdBy: providerId, updatedBy: providerId, createdAt: data.request.createdAt, updatedAt: data.request.updatedAt });
function source() {
  return { ...createAdminHomeSource(), loadBanners: vi.fn<ReturnType<typeof createAdminHomeSource>['loadBanners']>(async () => ({ items: [], page: 1, limit: 20, total: 0 })), previewBanner: vi.fn<ReturnType<typeof createAdminHomeSource>['previewBanner']>(async () => ({ banner, preview: true as const, mediaItems: [] })), loadMediaPreview: vi.fn(async (url: string) => url) };
}
function show(locale: SupportedLocale, bannerSource = source(), loadRequest = vi.fn(async () => data)) {
  renderWithLocale(<AdDeliveryActions requestId={id} providerId={providerId} locale={locale} loadRequest={loadRequest} bannerSource={bannerSource} />, { locale });
  return { bannerSource, loadRequest };
}

describe('Request delivery context', () => {
  it.each(['ar', 'en'] as const)('loads the customer brief, actual placement and empty creative state in %s', async locale => {
    const { bannerSource, loadRequest } = show(locale);
    await screen.findByTestId('ad-request-summary');
    expect(loadRequest).toHaveBeenCalledWith(id, expect.any(AbortSignal));
    expect(screen.getByTestId('ad-request-summary')).toHaveTextContent(data.request.purpose);
    expect(screen.getByTestId('ad-request-summary')).toHaveTextContent('property_promotion');
    expect(screen.getByRole('link', { name: data.request.contactPhone! })).toHaveAttribute('href', `tel:${data.request.contactPhone}`);
    expect(screen.getByRole('link', { name: locale === 'ar' ? 'إعداد بانر: بانر صفحة البحث' : 'Prepare banner: Search page banner' })).toHaveAttribute('href', `/admin/banners/new?requestId=${id}&lang=${locale}`);
    expect(bannerSource.loadBanners).toHaveBeenCalledWith({ adRequestId: id, page: 1, limit: 20 }, expect.any(AbortSignal));
    expect(await screen.findByText(locale === 'ar' ? /لا توجد بانرات أو صور إعلان مرتبطة/u : /No banners or advertising images are linked/u)).toBeInTheDocument();
    expect(screen.getByText(locale === 'ar' ? /لا يضع هذه العلامة تلقائيًا/u : /does not add that badge automatically/u)).toBeInTheDocument();
  });

  it('shows only the selected banner images and destination, never a receipt', async () => {
    const bannerSource = source();
    bannerSource.loadBanners = vi.fn(async () => ({ items: [banner], page: 1, limit: 20, total: 1 }));
    const image = { id: 'dddddddddddddddddddddddd', bannerId, url: 'https://example.com/customer-ad.png', mime: 'image/png' as const, width: 800, height: 600, active: true, version: 1, createdBy: providerId, createdAt: data.request.createdAt, updatedAt: data.request.updatedAt };
    bannerSource.previewBanner = vi.fn(async () => ({ banner, preview: true as const, mediaItems: [image] }));
    show('en', bannerSource);
    const creative = await screen.findByTestId('request-creative');
    expect(await within(creative).findByRole('img')).toHaveAttribute('src', image.url);
    expect(within(creative).getByRole('link')).toHaveAttribute('href', banner.targetUrl);
    expect(bannerSource.previewBanner).toHaveBeenCalledWith(bannerId, expect.any(AbortSignal));
    expect(creative).not.toHaveTextContent('payment-proof');
  });

  it('does not offer banner preparation when context failed and retries without affecting finance', async () => {
    const loader = vi.fn().mockRejectedValueOnce(new Error('permission')).mockResolvedValue(data);
    show('en', source(), loader);
    await screen.findByText(/Could not load the advertising brief/u);
    expect(screen.queryByRole('link', { name: /Prepare banner/u })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await screen.findByTestId('ad-request-summary');
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it('keeps missing campaign and missing images explicit and does not guess a property', async () => {
    const assisted = adAdminRequestSchema.parse({ request: { ...data.request, requestMode: 'assisted', placementKey: undefined, intervalStart: undefined, intervalEnd: undefined, status: 'review' } });
    show('en', source(), vi.fn(async () => assisted));
    await screen.findByTestId('ad-request-summary');
    expect(screen.queryByRole('link', { name: /Prepare banner/u })).not.toBeInTheDocument();
    expect(screen.getByTestId('ad-request-summary')).toHaveTextContent('Display placement not assigned yet');
    expect(screen.getByText(/request does not identify a specific property/u)).toBeInTheDocument();
  });

  it('reports unavailable banner permission instead of pretending there are no images', async () => {
    const bannerSource = source(); bannerSource.loadBanners.mockRejectedValue(new Error('permission'));
    show('en', bannerSource);
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Could not load request banners'));
    expect(screen.queryByText(/No banners or advertising images are linked/u)).not.toBeInTheDocument();
  });

  it('keeps the linked non-homepage placement selected even before placement settings load', () => {
    renderWithLocale(<select aria-label="Placement" value="search.sidebar" disabled><BannerPlacementOptions placementKey="search.sidebar" placements={[]} campaign={data} locale="en" /></select>, { locale: 'en' });
    expect(screen.getByRole('combobox')).toHaveValue('search.sidebar');
    expect(screen.getByRole('option')).toHaveTextContent('Search page banner');
    expect(screen.queryByText('Homepage banner')).not.toBeInTheDocument();
  });
});
