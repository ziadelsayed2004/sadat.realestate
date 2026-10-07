import { fireEvent, screen, waitFor } from '@testing-library/react';
import { cmsAdminContentDataSchema, type CmsAdminContentData } from '@sadat-real-estate/contracts';
import { describe, expect, it, vi } from 'vitest';
import { AdminCmsContent, getAdminCmsCopy, updateAdminCmsContent } from '../src/features/admin_content/index.ts';
import { ApiClient, ApiClientError } from '../src/features/contracts/index.ts';
import { renderWithLocale } from '../src/features/testing/index.ts';

const session = { status: 'authenticated' as const, role: 'admin' as const };
const path = '/admin/content/population-counter';
function data(value = 44000, version = 0): CmsAdminContentData {
  return cmsAdminContentDataSchema.parse({ namespace: 'population', items: [{
    id: 'dddddddddddddddddddddddd', status: 'available', value, version,
    sourceLabel: { ar: 'جهاز مدينة السادات', en: 'Sadat City authority' }, sourceUrl: 'https://example.com/report', asOf: '2026-10-07T00:00:00.000Z',
    reason: 'Approved sourced statement', updatedBy: 'cccccccccccccccccccccccc', updatedAt: '2026-10-07T10:00:00.000Z', availableActions: ['update']
  }] });
}
function input(id: string, value: string) {
  fireEvent.change(document.getElementById(`admin-cms-population-${id}`)!, { target: { value } });
}
function submit() { fireEvent.submit(screen.getByTestId('admin-cms-population-editor').querySelector('form')!); }

describe('population counter save feedback and validation', () => {
  it.each(['ar', 'en'] as const)('saves an existing statement twice through the real request schema with the latest version in %s', async locale => {
    const requests: Array<Record<string, unknown>> = [];
    const apiClient = new ApiClient({ fetcher: async (_url, init) => {
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      requests.push(body);
      return new Response(JSON.stringify({ data: data(Number(body.value), Number(body.version) + 1), meta: { requestId: 'population-save' } }), { status: 200, headers: { 'content-type': 'application/json' } });
    } });
    renderWithLocale(<AdminCmsContent path={path} locale={locale} session={session} initialData={data()} update={(namespace, payload) => updateAdminCmsContent(namespace, payload, { apiClient })} />, { locale });
    input('value', '45000'); input('reason', 'Update sourced count'); submit();
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(locale === 'ar' ? 'تم حفظ عداد السكان بنجاح' : 'saved successfully'));
    expect(requests[0]).toMatchObject({ version: 0, value: 45000, asOf: '2026-10-07T00:00:00.000Z' });
    expect(document.getElementById('admin-cms-population-value')).toHaveValue(45000);
    input('value', '46000'); submit();
    await waitFor(() => expect(requests).toHaveLength(2));
    expect(requests[1]).toMatchObject({ version: 1, value: 46000 });
    await waitFor(() => expect(screen.getByRole('status')).toBeVisible());
  });

  it.each(['ar', 'en'] as const)('identifies a missing date, retains the entered count and sends nothing in %s', async locale => {
    const update = vi.fn(async () => data());
    renderWithLocale(<AdminCmsContent path={path} locale={locale} session={session} initialData={data()} update={update} />, { locale });
    input('value', '44000'); input('as-of', ''); input('reason', 'Update population'); submit();
    expect(update).not.toHaveBeenCalled();
    expect(document.getElementById('admin-cms-population-as-of')).toHaveAttribute('aria-invalid', 'true');
    expect(document.getElementById('admin-cms-population-as-of')).toHaveFocus();
    expect(screen.getByText(locale === 'ar' ? 'اختر تاريخ البيان كاملًا: يوم وشهر وسنة.' : 'Choose the complete statement date: day, month and year.')).toBeVisible();
    expect(document.getElementById('admin-cms-population-value')).toHaveValue(44000);
  });

  it('lists all required publishing fields and preserves the draft after a server failure', async () => {
    const update = vi.fn(async () => { throw new ApiClientError('Conflict', { status: 409, code: 'HTTP_ERROR' }); });
    renderWithLocale(<AdminCmsContent path={path} locale="en" session={session} initialData={{ namespace: 'population', items: [] }} update={update} />, { locale: 'en' });
    input('status', 'available'); input('reason', 'Publish new statement'); submit();
    expect(update).not.toHaveBeenCalled();
    expect(document.getElementById('admin-cms-population-value')).toHaveAttribute('aria-invalid', 'true');
    expect(document.getElementById('admin-cms-population-source-ar')).toHaveAttribute('aria-invalid', 'true');
    expect(document.getElementById('admin-cms-population-url')).toHaveAttribute('aria-invalid', 'true');
    expect(document.getElementById('admin-cms-population-as-of')).toHaveAttribute('aria-invalid', 'true');
    input('value', '44000'); input('source-ar', 'جهاز المدينة'); input('url', 'https://example.com/report'); input('as-of', '2026-10-07'); submit();
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(getAdminCmsCopy('en').mutation.conflict));
    expect(document.getElementById('admin-cms-population-value')).toHaveValue(44000);
    expect(document.getElementById('admin-cms-population-source-ar')).toHaveValue('جهاز المدينة');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('hides a previously published count without submitting its disabled value', async () => {
    const hidden = cmsAdminContentDataSchema.parse({ namespace: 'population', items: [{ ...data().items[0], status: 'unavailable', value: undefined, version: 1 }] });
    const update = vi.fn(async (_namespace: string, _input: unknown) => hidden);
    renderWithLocale(<AdminCmsContent path={path} locale="en" session={session} initialData={data()} update={update} />, { locale: 'en' });
    input('status', 'unavailable'); input('reason', 'Withdraw statement'); submit();
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('The count is hidden'));
    expect(update.mock.calls[0]?.[1]).not.toHaveProperty('value');
  });
});
