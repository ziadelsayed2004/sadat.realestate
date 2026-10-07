import { useEffect, useState } from 'react';
import { publicBootstrapSuccessEnvelopeSchema, type PublicBootstrapData } from '@sadat-real-estate/contracts';
import { ApiClient } from '../contracts/index.ts';

type Contact = NonNullable<PublicBootstrapData['contact']>;
let cached: Contact = {};
let checkedAt = 0;
let pending: Promise<Contact> | undefined;
const listeners = new Set<(contact: Contact) => void>();

export function refreshPublicContact(): Promise<Contact> {
  if (pending) return pending;
  pending = new ApiClient().request('/public/bootstrap', { responseSchema: publicBootstrapSuccessEnvelopeSchema })
    .then(response => {
      cached = response.data.data.contact ?? {};
      checkedAt = Date.now();
      listeners.forEach(listener => listener(cached));
      return cached;
    }).catch(() => cached).finally(() => { pending = undefined; });
  return pending;
}

export function usePublicContact(): Contact {
  const [contact, setContact] = useState(cached);
  useEffect(() => {
    listeners.add(setContact);
    const refresh = () => { if (Date.now() - checkedAt > 30_000) void refreshPublicContact(); };
    refresh();
    window.addEventListener('focus', refresh);
    return () => { listeners.delete(setContact); window.removeEventListener('focus', refresh); };
  }, []);
  return contact;
}

export function WhatsAppIcon() {
  return <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a9 9 0 0 0-7.7 13.7L3 21l4.5-1.2A9 9 0 1 0 12 3Z" /><path d="m8.5 7.5 1.3 2.7-.9 1.1c.8 1.5 1.8 2.5 3.3 3.3l1.1-.9 2.7 1.3c-.3 1.5-1.3 2-2.5 1.7-3.2-.7-6-3.5-6.7-6.7-.3-1.2.2-2.2 1.7-2.5Z" /></svg>;
}
