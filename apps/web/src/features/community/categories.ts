import { useEffect, useState } from 'react';
import { communityCategoryListSuccessEnvelopeSchema, type CommunityCategory, type SupportedLocale } from '@sadat-real-estate/contracts';
import { ApiClient } from '../contracts/index.ts';

const changed = 'community-categories-changed';
export const refreshCommunityCategories = (items: CommunityCategory[]) => window.dispatchEvent(new CustomEvent(changed, { detail: items }));
export function useCommunityCategories(locale: SupportedLocale) {
  const [items, setItems] = useState<readonly { key: string; label: string }[]>();
  useEffect(() => {
    let active = true, sequence = 0;
    const update = (items: CommunityCategory[]) => setItems(items.map(item => ({ key: item.key, label: item.label[locale] ?? item.label.ar ?? item.label.en ?? item.key })));
    const refresh = () => { const current = ++sequence; void new ApiClient().request('/public/community/categories', { responseSchema: communityCategoryListSuccessEnvelopeSchema }).then(response => { if (active && current === sequence) update(response.data.data.items); }, () => undefined); };
    const receive = (event: Event) => { sequence++; update((event as CustomEvent<CommunityCategory[]>).detail); };
    refresh(); window.addEventListener('focus', refresh); window.addEventListener(changed, receive);
    return () => { active = false; window.removeEventListener('focus', refresh); window.removeEventListener(changed, receive); };
  }, [locale]);
  return items;
}
