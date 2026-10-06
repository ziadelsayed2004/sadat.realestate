import { useEffect, useRef, useState } from 'react';
import type { CmsAdminTeamMember, SupportedLocale } from '@sadat-real-estate/contracts';
import { ApiClientError } from '../contracts/index.ts';
import { Button } from '../design_system/index.ts';
import { getAdminCmsCopy } from './copy.ts';

export type TeamPhotoUpload = (file: File) => Promise<{ id: string; imageUrl: string }>;
export type TeamPhotoLoader = (id: string, signal?: AbortSignal) => Promise<Blob>;

export function TeamPhoto({ member, locale, disabled, upload, load, onChange, onBusy }: {
  member: CmsAdminTeamMember | undefined; locale: SupportedLocale; disabled: boolean;
  upload: TeamPhotoUpload; load: TeamPhotoLoader;
  onChange: (id: string | null) => void; onBusy: (busy: boolean) => void;
}) {
  const copy = getAdminCmsCopy(locale);
  const [preview, setPreview] = useState(member?.imageUrl?.startsWith('/api/v1/public/team-photos/') ? undefined : member?.imageUrl);
  const [hasPhoto, setHasPhoto] = useState(Boolean(member?.photoAssetId || member?.imageUrl));
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState('');
  const objectUrl = useRef<string | undefined>(undefined);
  const operation = useRef(0);
  const mounted = useRef(true);
  const setBlob = (blob: Blob) => {
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = URL.createObjectURL(blob);
    setPreview(objectUrl.current);
  };
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; if (objectUrl.current) URL.revokeObjectURL(objectUrl.current); };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    const current = operation.current;
    if (current === 0 && member?.photoAssetId && member.imageUrl?.startsWith('/api/v1/public/team-photos/')) {
      void load(member.photoAssetId, controller.signal).then(blob => {
        if (!controller.signal.aborted && operation.current === current) setBlob(blob);
      }).catch(() => { if (!controller.signal.aborted && operation.current === current) setFeedback(copy.photo.previewFailed); });
    }
    return () => { controller.abort(); };
  }, [member?.photoAssetId, member?.imageUrl, load, copy.photo.previewFailed]);
  const select = async (file?: File) => {
    if (!file || busy || disabled) return;
    operation.current += 1;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size === 0 || file.size > 10 * 1024 * 1024) { setFeedback(copy.photo.invalid); return; }
    setBusy(true); onBusy(true); setFeedback('');
    try {
      const photo = await upload(file);
      if (!mounted.current) return;
      setBlob(file); setHasPhoto(true); onChange(photo.id); setFeedback(copy.photo.uploaded);
    } catch (error) {
      if (mounted.current) setFeedback(error instanceof ApiClientError && error.status === 401 ? copy.mutation.sessionExpired : error instanceof ApiClientError && error.status === 403 ? copy.mutation.forbidden : error instanceof ApiClientError && error.status === 400 ? copy.photo.invalid : copy.photo.failed);
    } finally { if (mounted.current) { setBusy(false); onBusy(false); } }
  };
  return <fieldset className="admin-content__team-photo" disabled={disabled || busy}>
    <legend>{copy.photo.title}</legend>
    {preview ? <img src={preview} alt={copy.photo.preview} width="160" height="160" /> : null}
    <label htmlFor="admin-cms-team-photo">{hasPhoto ? copy.photo.replace : copy.photo.choose}
      <input id="admin-cms-team-photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; void select(file); }} aria-describedby="admin-cms-team-photo-hint" />
    </label>
    <p id="admin-cms-team-photo-hint">{copy.photo.hint}</p>
    {hasPhoto ? <Button type="button" variant="secondary" onClick={() => { operation.current += 1; if (objectUrl.current) { URL.revokeObjectURL(objectUrl.current); objectUrl.current = undefined; } setPreview(undefined); setHasPhoto(false); onChange(null); setFeedback(copy.photo.removed); }}>{copy.photo.remove}</Button> : null}
    <p role="status" aria-live="polite">{busy ? copy.photo.uploading : feedback}</p>
  </fieldset>;
}
