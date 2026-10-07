import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { PublicSiteFooter } from '../src/features/public/components.tsx';
import { refreshPublicContact } from '../src/features/public/contact.tsx';
import { getWhatsAppLink, getWhatsAppUrl } from '../src/features/frontend_foundation/config.ts';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
describe('configured public contacts', () => {
  it('normalizes Egyptian and international WhatsApp numbers and encodes the enquiry without a placeholder destination', () => {
    expect(getWhatsAppLink('عقار & details', '01012345678')).toBe('https://wa.me/201012345678?text=%D8%B9%D9%82%D8%A7%D8%B1%20%26%20details');
    expect(getWhatsAppLink(undefined, '00201012345678')).toBe('https://wa.me/201012345678');
    expect(getWhatsAppLink(undefined, 'not a phone')).toBeUndefined();
    expect(getWhatsAppLink()).toBeUndefined();
    expect(getWhatsAppUrl('https://api.whatsapp.com/send?phone=201012345678')).toBe('https://wa.me/201012345678');
    expect(getWhatsAppUrl('https://wa.me/201012345678', 'A & B')).toBe('https://wa.me/201012345678?text=A%20%26%20B');
    expect(getWhatsAppUrl('https://example.com/send?phone=201012345678')).toBeUndefined();
    expect(getWhatsAppUrl('javascript:alert(1)')).toBeUndefined();
  });
  it('renders only configured Facebook, Instagram and WhatsApp links and removes them when cleared', async () => {
    let contact: Record<string, string> = { phone: '+201098765432', whatsappNumber: '+201012345678', facebookUrl: 'https://facebook.com/sadat', instagramUrl: 'https://instagram.com/sadat' };
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ data: { defaultLocale: 'ar', supportedLocales: ['ar', 'en'], directions: { ar: 'rtl', en: 'ltr' }, display: {}, contact }, meta: { requestId: 'public-contact' } }), { headers: { 'content-type': 'application/json' } })));
    await refreshPublicContact();
    const result = render(<PublicSiteFooter locale="ar" />);
    expect(screen.getByRole('link', { name: 'Facebook' })).toHaveAttribute('href', contact.facebookUrl);
    expect(screen.getByRole('link', { name: 'Instagram' })).toHaveAttribute('href', contact.instagramUrl);
    expect(screen.getByRole('link', { name: 'WhatsApp' })).toHaveAttribute('href', 'https://wa.me/201012345678');
    expect(result.container.querySelectorAll('.public-site-footer__social a')).toHaveLength(3);
    result.unmount(); contact = {}; await refreshPublicContact(); render(<PublicSiteFooter locale="en" />);
    expect(screen.queryByRole('link', { name: 'WhatsApp' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Facebook' })).toBeNull();
  });
});
