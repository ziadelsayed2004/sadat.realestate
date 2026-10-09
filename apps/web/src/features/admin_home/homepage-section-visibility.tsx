import { useState, type FormEvent } from 'react';
import type { CmsAdminHomepageSection, SupportedLocale } from '@sadat-real-estate/contracts';
import { ApiClientError } from '../contracts/index.ts';
import { Button } from '../design_system/index.ts';
import { getAdminHomeCopy } from './copy.ts';
import type { AdminHomeCmsContent, AdminHomeSource } from './data.ts';

export function isHomepageSectionVisible(item: CmsAdminHomepageSection): boolean {
  return item.status === 'published' && item.visible;
}

export function homepageSectionActionLabel(item: CmsAdminHomepageSection, locale: SupportedLocale): string {
  if (isHomepageSectionVisible(item)) return locale === 'ar' ? 'إيقاف' : 'Stop';
  if (item.status === 'draft') return locale === 'ar' ? 'نشر' : 'Publish';
  return locale === 'ar' ? 'إعادة تشغيل' : 'Resume';
}

export function HomepageSectionVisibility({ item, locale, source, onSaved, onCancel }: {
  readonly item: CmsAdminHomepageSection;
  readonly locale: SupportedLocale;
  readonly source: AdminHomeSource;
  readonly onSaved: (data: AdminHomeCmsContent) => void;
  readonly onCancel: () => void;
}) {
  const copy = getAdminHomeCopy(locale);
  const stopping = isHomepageSectionVisible(item);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const title = item.title[locale] ?? item.title.ar ?? item.title.en;
  const allowed = item.availableActions.includes(stopping ? 'deactivate' : 'publish');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || !allowed) return;
    if (reason.trim().length < 3) { setError(copy.reasonRequired); return; }
    if (reason.trim().length > 500) { setError(copy.validation); return; }
    setSaving(true); setError(undefined);
    try {
      const data = await source.updateContent('homepage', {
        id: item.id, version: item.version, order: item.order,
        status: stopping ? 'inactive' : 'published', visible: !stopping, reason: reason.trim()
      });
      onSaved(data);
    } catch (failure) {
      setError(failure instanceof ApiClientError && failure.status === 409
        ? locale === 'ar' ? 'القسم اتعدل من مكان آخر. حدّث الصفحة وراجع حالته قبل المحاولة.' : 'This section changed elsewhere. Reload the page and check its status before trying again.'
        : failure instanceof ApiClientError && (failure.status === 401 || failure.status === 403)
          ? copy.states.permission.body : copy.mutation.failed);
    } finally { setSaving(false); }
  }

  return <section className="admin-home__editor" aria-labelledby="homepage-section-visibility-title" data-testid="homepage-section-visibility">
    <div className="admin-home__editor-heading"><div>
      <h2 id="homepage-section-visibility-title">{homepageSectionActionLabel(item, locale)}: {title}</h2>
      <p>{stopping
        ? locale === 'ar' ? 'سيختفي محتوى هذا القسم من الموقع بعد الحفظ. بياناته محفوظة ويمكنك إعادة تشغيله لاحقًا.' : 'This section’s content will be hidden after saving. Its data is kept so you can resume it later.'
        : locale === 'ar' ? 'سيظهر محتوى هذا القسم للزوار بعد الحفظ.' : 'This section’s content will be visible to visitors after saving.'}</p>
    </div></div>
    <form onSubmit={event => { void submit(event); }}>
      <label htmlFor="homepage-section-visibility-reason">{copy.reason}<textarea id="homepage-section-visibility-reason" value={reason} onChange={event => setReason(event.target.value)} minLength={3} maxLength={500} required disabled={saving} placeholder={copy.reasonPlaceholder} autoFocus /></label>
      <div className="admin-home__inline-actions">
        <Button type="submit" disabled={saving || !allowed} loading={saving}>{homepageSectionActionLabel(item, locale)}</Button>
        <Button type="button" variant="secondary" disabled={saving} onClick={onCancel}>{copy.cancel}</Button>
      </div>
      {error ? <p className="admin-home__feedback" role="alert">{error}</p> : null}
    </form>
  </section>;
}
