import { useEffect, useState } from 'react';
import { buildApiUrl } from '../contracts/api-client.ts';
import type { AdminAccountsAuthorizationSource } from './data.ts';

export function CompanyPhoto({ imageUrl, owner, authorization, apiOrigin, alt }: { imageUrl: string; owner: boolean; authorization?: AdminAccountsAuthorizationSource | undefined; apiOrigin?: string | undefined; alt: string }) {
  const [preview, setPreview] = useState('');
  useEffect(() => {
    const id = imageUrl.match(/^\/api\/v1\/public\/organization-photos\/([a-f0-9]{24})$/)?.[1];
    if (!id) { setPreview(imageUrl); return; }
    const controller = new AbortController(); let url = '';
    setPreview('');
    void fetch(buildApiUrl(apiOrigin, `${owner ? '/provider' : '/admin/providers'}/organization-photos/${id}`), { credentials: 'include', headers: { authorization: authorization?.getAuthorizationHeader() ?? '' }, signal: controller.signal })
      .then(async response => { if (!response.ok) return; const blob = await response.blob(); if (!controller.signal.aborted && blob.type.startsWith('image/')) { url = URL.createObjectURL(blob); setPreview(url); } }).catch(() => {});
    return () => { controller.abort(); if (url) URL.revokeObjectURL(url); };
  }, [imageUrl, owner, authorization, apiOrigin]);
  return preview ? <img className="admin-company-editor__photo" src={preview} alt={alt} /> : null;
}
