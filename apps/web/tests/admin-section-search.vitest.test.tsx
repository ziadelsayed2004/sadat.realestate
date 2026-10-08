import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AdminSectionSearch } from '../src/features/routing/admin-section-search.tsx';
import { getFoundationCopy } from '../src/features/frontend_foundation/locale.ts';

describe('admin header section search', () => {
  it.each(['ar', 'en'] as const)('opens matching sections and supports keyboard selection in %s', locale => {
    const copy = getFoundationCopy(locale).adminHeader;
    render(<AdminSectionSearch locale={locale} label={copy.searchLabel} placeholder={copy.search} />);
    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: locale === 'ar' ? 'المقالات' : 'Articles' } });
    const article = screen.getByRole('link', { name: locale === 'ar' ? /^المقالات$/u : /^Articles$/u });
    expect(article).toHaveAttribute('href', `/admin/articles?lang=${locale}`);
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(article).toHaveFocus();
    fireEvent.keyDown(article, { key: 'Escape' });
    expect(input).toHaveFocus();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    fireEvent.change(input, { target: { value: locale === 'ar' ? 'فريق العمل' : 'Team' } });
    expect(screen.getByRole('link', { name: locale === 'ar' ? 'فريق العمل' : 'Team' })).toHaveAttribute('href', `/admin/content/team?lang=${locale}`);
  });

  it('shows a truthful empty state, clears results and handles Arabic variants', () => {
    render(<AdminSectionSearch locale="ar" label="Search" placeholder="Find a section" />);
    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: 'الإعدادات' } });
    const names = within(document.getElementById('admin-section-search-results')!).getAllByRole('link').map(item => item.textContent);
    fireEvent.change(input, { target: { value: 'الاعدادات' } });
    expect(screen.getAllByRole('link').map(item => item.textContent)).toEqual(names);
    fireEvent.change(input, { target: { value: 'no-such-section' } });
    expect(screen.getByRole('status')).toHaveTextContent('لا يوجد قسم بهذا الاسم.');
    fireEvent.change(input, { target: { value: '' } });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
