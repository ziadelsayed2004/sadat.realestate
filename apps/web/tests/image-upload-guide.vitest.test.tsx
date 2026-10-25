import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ImageUploadGuide, imageRatio, matchesImageRatio } from '../src/features/design_system/image-upload-guide.tsx';
import { renderWithLocale } from '../src/features/testing/index.ts';

afterEach(() => vi.unstubAllGlobals());
describe('image aspect ratio guidance', () => {
  it('uses proportions rather than a required pixel resolution', () => {
    expect(imageRatio(1500, 1000)).toBe('3:2');
    expect(imageRatio(900, 600)).toBe('3:2');
    expect(matchesImageRatio(900, 600, 'property')).toBe(true);
    expect(matchesImageRatio(300, 300, 'property')).toBe(false);
    expect(matchesImageRatio(600, 900, 'property')).toBe(false);
    expect(matchesImageRatio(512, 512, 'logo')).toBe(true);
  });
  it.each(['ar', 'en'] as const)('warns about actual shape without blocking or replacing the upload in %s', async locale => {
    const revoked: string[] = [];
    vi.stubGlobal('URL', class extends URL { static createObjectURL() { return 'blob:ratio-test'; } static revokeObjectURL(url: string) { revoked.push(url); } });
    vi.stubGlobal('Image', class { naturalWidth = 300; naturalHeight = 300; onload: (() => void) | null = null; onerror = null; set src(_value: string) { queueMicrotask(() => this.onload?.()); } });
    const upload = vi.fn((event: { currentTarget: HTMLInputElement }) => { event.currentTarget.value = ''; });
    const result = renderWithLocale(<ImageUploadGuide locale={locale} kind="property"><label>Photo<input type="file" onChange={upload} aria-describedby="existing-help" /></label></ImageUploadGuide>, { locale });
    const input = screen.getByLabelText('Photo');
    expect(input.getAttribute('aria-describedby')).toContain('existing-help');
    const file = new File(['original image bytes'], 'square.jpg', { type: 'image/jpeg' });
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => expect(result.container.querySelector('[data-match="false"]')).toHaveTextContent('1:1'));
    expect(upload).toHaveBeenCalledOnce();
    expect(revoked).toEqual(['blob:ratio-test']);
    expect(result.container.textContent).toContain(locale === 'ar' ? 'ملء الإطار سيقصّ الأطراف' : 'filling the frame crops edges');
    expect(file.size).toBe(20);
  });
});
