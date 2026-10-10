import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AdPlacementGuide } from '../src/features/admin_ads/placement-guide.tsx';
import { renderWithLocale } from '../src/features/testing/index.ts';

describe('advertising placement explanations', () => {
  it.each(['ar', 'en'] as const)('distinguishes the two homepage positions and links the selected section in %s', locale => {
    const ar = locale === 'ar';
    const result = renderWithLocale(<AdPlacementGuide placementKey="homepage.hero" locale={locale} />, { locale });
    const link = screen.getByRole('link', { name: ar ? 'فتح مكانه في الموقع' : 'Open its location on the site' });
    expect(link).toHaveAttribute('href', `/?lang=${locale}#homepage-hero`);
    expect(result.container.querySelector('[data-selected]')).toHaveTextContent(ar ? 'بانر أعلى الرئيسية' : 'Homepage hero banner');
    result.rerender(<AdPlacementGuide placementKey="homepage.featured" locale={locale} />);
    expect(link).toHaveAttribute('href', `/?lang=${locale}#homepage-featured`);
    expect(result.container.querySelector('[data-selected]')).toHaveTextContent(ar ? 'إعلانات الرئيسية المميزة' : 'Featured homepage ads');
    // The preview link is separate from the advertiser's destination URL.
    fireEvent.focus(link);
    expect(link).toHaveAttribute('target', '_blank');
  });
  it('does not invent a display location for an unassigned or custom placement', () => {
    const result = renderWithLocale(<AdPlacementGuide locale="en" />, { locale: 'en' });
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(result.container).toHaveTextContent('Placement differs from the page opened by the ad button.');
    result.rerender(<AdPlacementGuide placementKey="search.sidebar" locale="en" />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(result.container).toHaveTextContent('confirm its display page before publishing');
  });
});
