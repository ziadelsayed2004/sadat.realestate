import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ArticleImageSlider } from '../src/features/content/article-image-slider.tsx';
import { renderWithLocale } from '../src/features/testing/index.ts';

const slides = ['a', 'b', 'c'].map(key => ({ key, src: `/assets/${key}.png` }));
describe('Article image slider', () => {
  it.each(['ar', 'en'] as const)('shows one full image, supports buttons, keyboard and touch in %s', locale => {
    const ar = locale === 'ar';
    renderWithLocale(<ArticleImageSlider images={slides} title="Article cover" locale={locale} />, { locale });
    const region = screen.getByRole('region', { name: ar ? 'صور المقال' : 'Article images' });
    expect(region.querySelectorAll('img')).toHaveLength(1);
    expect(screen.getByRole('button', { name: ar ? 'الصورة السابقة' : 'Previous image' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: ar ? 'الصورة التالية' : 'Next image' }));
    expect(screen.getByRole('img')).toHaveAttribute('src', slides[1]!.src);
    fireEvent.keyDown(region, { key: ar ? 'ArrowLeft' : 'ArrowRight' });
    expect(screen.getByRole('img')).toHaveAttribute('src', slides[2]!.src);
    fireEvent.keyDown(region, { key: 'Home' });
    const frame = region.querySelector('.article-image-slider__frame')!;
    fireEvent.touchStart(frame, { touches: [{ clientX: 150, clientY: 20 }] });
    fireEvent.touchEnd(frame, { changedTouches: [{ clientX: ar ? 240 : 40, clientY: 22 }] });
    expect(screen.getByRole('img')).toHaveAttribute('src', slides[1]!.src);
  });
  it('skips broken images, deduplicates repeated covers and keeps a fallback when all fail', () => {
    renderWithLocale(<ArticleImageSlider images={[slides[0]!, slides[0]!, slides[1]!, { key: 'unsafe', src: 'javascript:alert(1)' }]} title="Cover" locale="en" />, { locale: 'en' });
    expect(screen.getByText('Image 1 of 2')).toBeInTheDocument();
    fireEvent.error(screen.getByRole('img'));
    expect(screen.getByRole('img')).toHaveAttribute('src', slides[1]!.src);
    expect(screen.queryByRole('button', { name: 'Next image' })).not.toBeInTheDocument();
    fireEvent.error(screen.getByRole('img'));
    expect(screen.getByText('Article images are currently unavailable')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
  it('keeps an empty gallery readable and allows controlled blob previews only in the editor', () => {
    const { rerender } = renderWithLocale(<ArticleImageSlider images={[{ key: 'blob', src: 'blob:preview' }]} title="Preview" locale="en" />, { locale: 'en' });
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    rerender(<ArticleImageSlider preview images={[{ key: 'blob', src: 'blob:preview' }]} title="Preview" locale="en" />);
    expect(screen.getByRole('img')).toHaveAttribute('src', 'blob:preview');
  });
});
