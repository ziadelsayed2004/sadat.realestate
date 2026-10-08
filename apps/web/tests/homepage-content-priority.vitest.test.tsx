import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { publicHomepageDataSchema } from '@sadat-real-estate/contracts';
import { PublicHomepage } from '../src/features/public/index.ts';
import { renderWithLocale } from '../src/features/testing/index.ts';

describe('homepage text comes from the selected content source', () => {
  it.each(['ar', 'en'] as const)('uses the edited hero section over legacy seeded banner copy in %s', locale => {
    const body = { ar: 'المحتوى الذي كتبه صاحب الموقع', en: 'Content written by the site owner' };
    const data = publicHomepageDataSchema.parse({ sections: [{ key: 'other', title: { en: 'Other section' }, body: { en: 'Wrong section' }, order: 0 }, { key: 'hero', title: { ar: 'العنوان الجديد', en: 'New title' }, body, order: 10 }], banners: [{ key: 'hero', title: { en: 'Seed title' }, body: { en: 'Seed description' }, order: 0 }], categories: [], locations: [], metrics: [], properties: [], developers: [], content: [] });
    renderWithLocale(<PublicHomepage locale={locale} initialData={data} />, { locale });
    expect(screen.getByText(body[locale])).toBeInTheDocument();
    expect(screen.queryByText('Seed description')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(locale === 'ar' ? 'العنوان الجديد' : 'New title');
  });
});
