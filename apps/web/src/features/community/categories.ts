import { useEffect, useState } from 'react';
import { communityCategoryListSuccessEnvelopeSchema, type SupportedLocale } from '@sadat-real-estate/contracts';
import { ApiClient } from '../contracts/index.ts';

export function useCommunityCategories(locale: SupportedLocale) {
  const [items, setItems] = useState<readonly { key: string; label: string }[]>([]);
  useEffect(() => {
    let active = true;
    const refresh = () => { void new ApiClient().request('/public/community/categories', { responseSchema: communityCategoryListSuccessEnvelopeSchema }).then(response => { if (active) setItems(response.data.data.items.map(item => ({ key: item.key, label: item.label[locale] ?? item.label.ar ?? item.label.en ?? item.key }))); }, () => undefined); };
    refresh(); window.addEventListener('focus', refresh);
    return () => { active = false; window.removeEventListener('focus', refresh); };
  }, [locale]);
  return items;
}
