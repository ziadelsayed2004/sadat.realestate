import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithLocale } from '../src/features/testing/index.ts';
import { SectionPreview } from '../src/features/admin_home/section-preview.tsx';
import { AuditChanges } from '../src/features/admin/audit-changes.tsx';
import { auditTargetHref } from '../src/features/admin/audit-target-link.tsx';

describe('October 20 content placement and audit clarity', () => {
  it('previews the edited heading and description and opens its actual homepage location', () => {
    const result = renderWithLocale(<SectionPreview sectionKey="featured_properties" title={{ en: 'Chosen homes' }} body={{ en: 'Homes selected for you' }} locale="en" />, { locale: 'en' });
    expect(screen.getByRole('heading', { name: 'Chosen homes' })).toBeInTheDocument();
    expect(screen.getByText('Homes selected for you')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Open its location/ })).toHaveAttribute('href', '/?lang=en#public-homepage-properties');
    expect(result.container.querySelector('[aria-current=location]')).toHaveTextContent('Featured properties');
  });
  it('explains that an old key is not a working display location', () => {
    renderWithLocale(<SectionPreview sectionKey="local_preview_intro" title={{ en: 'Old text' }} body={{}} locale="en" />, { locale: 'en' });
    expect(screen.getByRole('status')).toHaveTextContent('legacy key has no visible section');
    expect(screen.queryByRole('link', { name: /Open its location/ })).not.toBeInTheDocument();
  });
  it('labels actual content changes and links CMS records to their editor', () => {
    renderWithLocale(<AuditChanges locale="en" log={{ before: { title: { en: 'Old heading' }, version: 0 }, after: { title: { en: 'New heading' }, version: 1 } } as never} />, { locale: 'en' });
    expect(screen.getByText('Old heading')).toBeInTheDocument();
    expect(screen.getByText('New heading')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Version' })).not.toBeInTheDocument();
    expect(auditTargetHref({ targetType: 'cms_homepage_section', targetId: 'a'.repeat(24) }, 'ar')).toBe('/admin/content/homepage?contentId=' + 'a'.repeat(24) + '&lang=ar');
  });
});
