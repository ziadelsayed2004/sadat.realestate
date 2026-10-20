import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ArticleImageCarousel } from '../src/features/content/article-image-carousel.tsx';
import { renderWithLocale } from '../src/features/testing/index.ts';

const images = ['a', 'b', 'c'].map(key => ({ key, src: `/assets/${key}.png` }));
describe('Article image carousel', () => {
  it.each(['ar', 'en'] as const)('keeps additional images together in a horizontal track in %s', locale => {
    const ar = locale === 'ar';
    renderWithLocale(<ArticleImageCarousel images={images} title="Article" locale={locale} />, { locale });
    const region = screen.getByRole('region', { name: ar ? 'صور المقال' : 'Article images' });
    expect(region).toHaveAttribute('dir', ar ? 'rtl' : 'ltr');
    expect(region.querySelectorAll('.article-image-carousel__track > figure > img')).toHaveLength(3);
    expect(screen.getByRole('button', { name: ar ? 'الصورة السابقة' : 'Previous image' })).toBeDisabled();
    expect(screen.getByRole('button', { name: ar ? 'الصورة التالية' : 'Next image' })).toBeEnabled();
    expect(Array.from(region.querySelectorAll('img'), image => image.getAttribute('src'))).toEqual(images.map(image => image.src));
  });
  it('deduplicates images, excludes unsafe sources and removes failed cards without losing the others', () => {
    renderWithLocale(<ArticleImageCarousel images={[images[0]!, images[0]!, images[1]!, { key: 'unsafe', src: 'javascript:alert(1)' }]} title="Article" locale="en" />, { locale: 'en' });
    expect(screen.getAllByRole('img')).toHaveLength(2);
    fireEvent.error(screen.getAllByRole('img')[0]!);
    expect(screen.getByRole('img')).toHaveAttribute('src', images[1]!.src);
    expect(screen.queryByRole('button', { name: 'Next image' })).not.toBeInTheDocument();
    fireEvent.error(screen.getByRole('img'));
    expect(screen.getByText('Article images are currently unavailable')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
  it('keeps an empty gallery readable and allows controlled blob previews only in the editor', () => {
    const { rerender } = renderWithLocale(<ArticleImageCarousel images={[{ key: 'blob', src: 'blob:preview' }]} title="Preview" locale="en" />, { locale: 'en' });
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    rerender(<ArticleImageCarousel preview images={[{ key: 'blob', src: 'blob:preview' }]} title="Preview" locale="en" />);
    expect(screen.getByRole('img')).toHaveAttribute('src', 'blob:preview');
  });
});
