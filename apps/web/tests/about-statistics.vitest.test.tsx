import { useState } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { SupportedLocale } from '@sadat-real-estate/contracts';
import { AboutStatisticsFields, aboutStatDrafts } from '../src/features/admin_content/about-statistics.tsx';

function Editor({ locale }: { locale: SupportedLocale }) {
  const [stats, setStats] = useState(aboutStatDrafts(undefined));
  return <AboutStatisticsFields stats={stats} onChange={setStats} locale={locale} disabled={false} />;
}
describe('About statistic explanations and preview', () => {
  it.each(['ar', 'en'] as const)('shows literal values, current labels and visibility in %s before saving', locale => {
    render(<Editor locale={locale} />);
    const preview = screen.getByTestId('admin-about-statistics-preview');
    expect(preview.querySelectorAll('article')).toHaveLength(4);
    fireEvent.change(screen.getByLabelText(locale === 'ar' ? 'قيمة البطاقة 4' : 'Card 4 value'), { target: { value: '342K+88' } });
    expect(within(preview).getByText('342K+88')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(locale === 'ar' ? 'عنوان البطاقة 4 بالعربية' : 'Card 4 English label'), { target: { value: 'Updated label' } });
    expect(within(preview).getByText('Updated label')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(locale === 'ar' ? 'إظهار البطاقة 4' : 'Show card 4'));
    expect(within(preview).queryByText('342K+88')).not.toBeInTheDocument();
    for (const checkbox of screen.getAllByRole('checkbox').slice(0, 3)) fireEvent.click(checkbox);
    expect(preview.querySelectorAll('article')).toHaveLength(0);
    expect(preview).toHaveTextContent(locale === 'ar' ? 'كل البطاقات مخفية' : 'All cards are hidden');
    expect(screen.getByRole('link')).toHaveAttribute('href', `/about?lang=${locale}#about-statistics`);
    expect(screen.getByText(locale === 'ar' ? /لا تتحدث تلقائيًا/u : /do not update automatically/u)).toBeInTheDocument();
  });
});
