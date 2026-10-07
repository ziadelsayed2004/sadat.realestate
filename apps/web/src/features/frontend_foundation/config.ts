export function getWhatsAppLink(message?: string, number?: string): string | undefined {
  if (!number) return undefined;
  const compact = number.trim().replace(/[\s().-]/gu, '');
  let digitsOnly = compact.replace(/^\+|^00/gu, '');
  if (/^01\d{9}$/u.test(digitsOnly)) digitsOnly = `2${digitsOnly}`;
  if (!/^[1-9]\d{7,14}$/u.test(digitsOnly)) return undefined;
  const base = `https://wa.me/${digitsOnly}`;
  if (message && message.trim() !== '') {
    return `${base}?text=${encodeURIComponent(message.trim())}`;
  }
  return base;
}

export function getWhatsAppUrl(value?: string, message?: string): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return undefined;
    const number = url.hostname === 'wa.me' ? url.pathname.slice(1)
      : ['api.whatsapp.com', 'web.whatsapp.com'].includes(url.hostname) && url.pathname === '/send' ? url.searchParams.get('phone') ?? undefined : undefined;
    return getWhatsAppLink(message ?? url.searchParams.get('text') ?? undefined, number);
  } catch { return undefined; }
}
