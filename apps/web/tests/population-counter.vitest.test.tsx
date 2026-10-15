import { fireEvent, screen, waitFor } from '@testing-library/react';
import { cmsAdminContentDataSchema } from '@sadat-real-estate/contracts';
import { describe, expect, it, vi } from 'vitest';
import { AdminCmsContent } from '../src/features/admin_content/index.ts';
import { renderWithLocale } from '../src/features/testing/index.ts';

const session = { status: 'authenticated' as const, role: 'admin' as const };
const path = '/admin/content/population-counter';
const sourceUrl = 'https://worldpopulationreview.com/cities/egypt/sadat-city';
function data(available: boolean) {
  return cmsAdminContentDataSchema.parse({ namespace: 'population', items: [{
    id: '000000000000000000000001', status: available ? 'available' : 'unavailable', version: 0,
    automatic: true, ...(available ? { value: 79120, sourceYear: 2026, sourceLabel: { en: 'World Population Review' }, sourceUrl, asOf: '2026-01-01T00:00:00.000Z', checkedAt: '2026-10-11T10:00:00.000Z' } : {}),
    reason: 'Automatic source estimate', updatedAt: '2026-10-11T10:00:00.000Z', availableActions: []
  }] });
}

describe('automatic population reference', () => {
  it.each(['ar', 'en'] as const)('saves a manual city count with the latest version and keeps population unchanged in %s', async locale => {
    let display = cmsAdminContentDataSchema.parse({ namespace: 'display', items: [{
      id: 'dddddddddddddddddddddddd', key: 'city_metric_buildings', value: { kind: 'number', value: 50 }, status: 'published',
      version: 2, updatedBy: 'cccccccccccccccccccccccc', updatedAt: '2026-10-11T10:00:00.000Z', availableActions: ['update', 'publish']
    }] });
    const update = vi.fn(async (_namespace: string, input: unknown) => {
      const body = input as { version: number; value: { kind: string; value: number } };
      display = cmsAdminContentDataSchema.parse({ namespace: 'display', items: [{ ...display.items[0], value: body.value, version: body.version + 1 }] });
      return display;
    });
    renderWithLocale(<AdminCmsContent path={path} locale={locale} session={session} initialData={data(true)} load={async () => display} update={update} />, { locale });
    const count = await screen.findByLabelText(locale === 'ar' ? 'المباني' : 'Buildings');
    expect(count).toHaveValue(50);
    fireEvent.change(count, { target: { value: '123' } });
    fireEvent.change(screen.getByLabelText(locale === 'ar' ? 'سبب التعديل' : 'Change reason'), { target: { value: 'Update approved building count' } });
    fireEvent.submit(count.closest('form')!);
    await waitFor(() => expect(update).toHaveBeenCalledWith('display', expect.objectContaining({ id: 'dddddddddddddddddddddddd', version: 2, value: { kind: 'number', value: 123 } })));
    await waitFor(() => expect(screen.getByRole('status')).toBeVisible());
    expect(screen.getByTestId('admin-cms-population-editor')).toHaveTextContent(new Intl.NumberFormat(locale).format(79120));
    fireEvent.change(count, { target: { value: '124' } }); fireEvent.submit(count.closest('form')!);
    await waitFor(() => expect(update).toHaveBeenLastCalledWith('display', expect.objectContaining({ version: 3, value: { kind: 'number', value: 124 } })));
  });

  it('preserves manual input on save failure and sends no invalid counts', async () => {
    const display = cmsAdminContentDataSchema.parse({ namespace: 'display', items: [] });
    const update = vi.fn(async () => { throw new Error('failed'); });
    renderWithLocale(<AdminCmsContent path={path} locale="en" session={session} initialData={data(true)} load={async () => display} update={update} />, { locale: 'en' });
    const count = await screen.findByLabelText('Buildings');
    fireEvent.change(count, { target: { value: '-1' } });
    fireEvent.change(screen.getByLabelText('Change reason'), { target: { value: 'Update approved building count' } });
    fireEvent.submit(count.closest('form')!); expect(update).not.toHaveBeenCalled();
    fireEvent.change(count, { target: { value: '100' } }); fireEvent.submit(count.closest('form')!);
    await waitFor(() => expect(update).toHaveBeenCalledWith('display', expect.objectContaining({ key: 'city_metric_buildings', status: 'published', value: { kind: 'number', value: 100 } })));
    await waitFor(() => expect(screen.getByRole('alert')).toBeVisible());
    expect(count).toHaveValue(100); expect(screen.getByLabelText('Change reason')).toHaveValue('Update approved building count');
  });
  it.each(['ar', 'en'] as const)('shows the verified number, estimate year and source without editable fields in %s', locale => {
    const update = vi.fn();
    renderWithLocale(<AdminCmsContent path={path} locale={locale} session={session} initialData={data(true)} load={async () => cmsAdminContentDataSchema.parse({ namespace: 'display', items: [] })} update={update} />, { locale });
    expect(screen.getByTestId('admin-cms-population-editor')).toHaveTextContent(new Intl.NumberFormat(locale).format(79120));
    expect(screen.getByTestId('admin-cms-population-editor')).toHaveTextContent('2026');
    expect(screen.getByRole('link', { name: locale === 'ar' ? 'عرض مصدر عدد السكان' : 'View population source' })).toHaveAttribute('href', sourceUrl);
    expect(screen.getByTestId('admin-cms-population-editor').querySelector('time')).toHaveAttribute('datetime', '2026-10-11T10:00:00.000Z');
    expect(screen.getByTestId('admin-cms-population-editor').querySelector('input')).toBeNull();
    expect(screen.getByTestId('admin-cms-population-editor').querySelector('textarea')).toBeNull();
    expect(screen.getByTestId('admin-cms-population-editor').querySelector('form')).toBeNull();
    expect(update).not.toHaveBeenCalled();
  });

  it.each(['ar', 'en'] as const)('explains an unavailable first retrieval without presenting a fabricated number in %s', locale => {
    renderWithLocale(<AdminCmsContent path={path} locale={locale} session={session} initialData={data(false)} load={async () => cmsAdminContentDataSchema.parse({ namespace: 'display', items: [] })} />, { locale });
    expect(screen.getByTestId('admin-cms-population-editor')).toHaveTextContent(locale === 'ar' ? 'لم يتم جلب تقدير السكان' : 'has not been retrieved');
    expect(screen.getByTestId('admin-cms-population-editor')).not.toHaveTextContent('79,120');
    expect(screen.getByRole('link', { name: locale === 'ar' ? 'عرض مصدر عدد السكان' : 'View population source' })).toHaveAttribute('href', sourceUrl);
  });
});
