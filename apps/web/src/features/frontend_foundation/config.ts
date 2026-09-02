export const DEFAULT_WHATSAPP_NUMBER = '201001234567';

export function getWhatsAppNumber(): string {
  if (typeof import.meta !== 'undefined' && import.meta.env && typeof import.meta.env.VITE_WHATSAPP_NUMBER === 'string' && import.meta.env.VITE_WHATSAPP_NUMBER.trim() !== '') {
    return import.meta.env.VITE_WHATSAPP_NUMBER.trim();
  }
  if (typeof process !== 'undefined' && process.env && typeof process.env.VITE_WHATSAPP_NUMBER === 'string' && process.env.VITE_WHATSAPP_NUMBER.trim() !== '') {
    return process.env.VITE_WHATSAPP_NUMBER.trim();
  }
  return DEFAULT_WHATSAPP_NUMBER;
}

export function getWhatsAppLink(message?: string): string {
  const digitsOnly = getWhatsAppNumber().replace(/[^0-9]/g, '');
  const base = `https://wa.me/${digitsOnly}`;
  if (message && message.trim() !== '') {
    return `${base}?text=${encodeURIComponent(message.trim())}`;
  }
  return base;
}
