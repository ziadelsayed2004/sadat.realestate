import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { CompanyEditor } from '../src/features/admin_accounts/company-editor.tsx';
import { server } from '../src/features/testing/msw/server.ts';
import { renderWithLocale } from '../src/features/testing/index.ts';

describe('Admin provider image display', () => {
  it.each(['developer', 'office'])('saves the %s cover fitting without changing its logo or cover', async kind => {
    const profile = { id: 'a'.repeat(24), slug: `${kind}-sample`, version: 2, name: { en: 'Provider' }, description: {}, imageUrl: null, logoUrl: null, coverFit: 'cover', status: 'approved' };
    let saved: Record<string, unknown> | undefined;
    server.use(
      http.get('*/api/v1/admin/providers/:id/organization', () => HttpResponse.json({ data: profile })),
      http.patch('*/api/v1/admin/providers/:id/organization', async ({ request }) => {
        saved = await request.json() as Record<string, unknown>;
        return HttpResponse.json({ data: { ...profile, ...saved, version: 3 } });
      })
    );
    renderWithLocale(<CompanyEditor providerId={'b'.repeat(24)} locale="en" directory={kind === 'developer'} />, { locale: 'en' });
    fireEvent.change(await screen.findByRole('combobox', { name: /Image display/ }), { target: { value: 'contain' } });
    fireEvent.change(screen.getByLabelText('Change or removal reason'), { target: { value: 'Show the full cover' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save company' }));
    await waitFor(() => expect(saved).toMatchObject({ version: 2, coverFit: 'contain' }));
    expect(saved).not.toHaveProperty('imageUrl');
    expect(saved).not.toHaveProperty('logoUrl');
    expect(screen.queryByRole('link', { name: 'View company page' }) !== null).toBe(kind === 'developer');
  });

  it('lets the admin edit an individual owner identity without presenting a developer directory action', async () => {
    server.use(http.get('*/api/v1/admin/providers/:id/organization', () => HttpResponse.json({ data: {
      id: 'a'.repeat(24), slug: `broker-${'b'.repeat(24)}`, version: 1, name: { en: 'Owner' }, description: {}, imageUrl: null, logoUrl: null, status: 'approved'
    } })));
    renderWithLocale(<CompanyEditor providerId={'b'.repeat(24)} locale="en" directory={false} />, { locale: 'en' });
    expect(await screen.findByRole('button', { name: 'Save public identity' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Manage public name and photo' })).toBeVisible();
    expect(screen.queryByRole('combobox', { name: /Image display/ })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Remove company from directory' })).toBeNull();
  });
});
