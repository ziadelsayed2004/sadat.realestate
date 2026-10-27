import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { PublicFloatingActions } from '../src/features/public/floating-actions.tsx';

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it.each(['ar', 'en'] as const)('tracks scroll, clamps progress, updates after a resize and returns to the top in %s', async locale => {
  let position = 0, height = 2600;
  vi.spyOn(window, 'scrollY', 'get').mockImplementation(() => position);
  vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(600);
  vi.spyOn(document.documentElement, 'scrollHeight', 'get').mockImplementation(() => height);
  const scrollTo = vi.fn();
  vi.stubGlobal('scrollTo', scrollTo);
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false })));
  const { container, unmount } = render(<PublicFloatingActions locale={locale} whatsapp="https://wa.me/201012345678" />);
  const label = locale === 'ar' ? 'العودة لأعلى الصفحة' : 'Back to top';
  expect(screen.queryByRole('button', { name: label })).toBeNull();
  const whatsapp = screen.getByRole('link');
  expect(whatsapp).toHaveAttribute('href', 'https://wa.me/201012345678');
  expect(whatsapp).toHaveAttribute('rel', 'noopener noreferrer');
  position = 1000;
  fireEvent.scroll(window);
  const top = await screen.findByRole('button', { name: label });
  expect(container.querySelector('.public-floating-actions__value')).toHaveAttribute('stroke-dashoffset', '50');
  expect(whatsapp.compareDocumentPosition(top) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  fireEvent.click(top);
  expect(scrollTo).toHaveBeenLastCalledWith({ top: 0, behavior: 'smooth' });
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })));
  fireEvent.click(top);
  expect(scrollTo).toHaveBeenLastCalledWith({ top: 0, behavior: 'instant' });
  height = 1600;
  fireEvent.resize(window);
  await waitFor(() => expect(container.querySelector('.public-floating-actions__value')).toHaveAttribute('stroke-dashoffset', '0'));
  position = 0;
  fireEvent.scroll(window);
  await waitFor(() => expect(screen.queryByRole('button', { name: label })).toBeNull());
  unmount();
  await act(async () => { fireEvent.scroll(window); });
});

it('keeps back-to-top available without inventing a WhatsApp contact number', () => {
  vi.spyOn(window, 'scrollY', 'get').mockReturnValue(300);
  render(<PublicFloatingActions locale="ar" />);
  expect(screen.queryByRole('link')).toBeNull();
  expect(screen.getByRole('button', { name: 'العودة لأعلى الصفحة' })).toBeInTheDocument();
});
