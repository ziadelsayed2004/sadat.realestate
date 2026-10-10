import { useEffect, useState } from 'react';
import type { ProjectData, SupportedLocale } from '@sadat-real-estate/contracts';
import { Button } from '../design_system/index.ts';
import { ApiClientError } from '../contracts/index.ts';
import { updateAdminProject, type AdminProjectsAuthorizationSource } from './data.ts';

export function ProjectEditor({ project, locale, authorization, apiOrigin, onSaved }: { project: ProjectData; locale: SupportedLocale; authorization?: AdminProjectsAuthorizationSource | undefined; apiOrigin?: string | undefined; onSaved: (project: ProjectData) => void }) {
  const ar = locale === 'ar';
  useEffect(() => { if (window.location.hash === '#project-edit') document.getElementById('project-edit')?.scrollIntoView(); }, []);
  const [name, setName] = useState({ ar: project.name.ar ?? '', en: project.name.en ?? '' });
  const [description, setDescription] = useState({ ar: project.description?.ar ?? '', en: project.description?.en ?? '' });
  const [website, setWebsite] = useState(project.website ?? '');
  const [slug, setSlug] = useState(project.slug);
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [failed, setFailed] = useState(false);
  const localized = (value: typeof name) => Object.fromEntries(Object.entries(value).filter(([, text]) => text.trim()).map(([language, text]) => [language, text.trim()]));
  async function save() {
    if (busy) return;
    setBusy(true); setFeedback(''); setFailed(false);
    try {
      const next = await updateAdminProject(project.id, { version: project.version, reason: 'Administrative project edit', name: localized(name), description: Object.values(description).some(value => value.trim()) ? localized(description) : null, slug, website: website.trim() || null }, { authorization, apiOrigin });
      onSaved(next); setPreview(false); setFeedback(ar ? 'تم حفظ المشروع.' : 'Project saved.');
    } catch (error) {
      setFailed(true);
      setFeedback(error instanceof ApiClientError && error.status === 409 ? (ar ? 'تعارض في البيانات أو الرابط؛ حدّث المشروع وراجع الرابط.' : 'Data or link conflict. Refresh and check the link.') : (ar ? 'راجع البيانات والصلاحيات وحاول مجددًا؛ مدخلاتك محفوظة.' : 'Check the fields and permissions, then retry. Your entries are preserved.'));
    } finally { setBusy(false); }
  }
  return <form id="project-edit" className="admin-projects__action-card" onSubmit={event => { event.preventDefault(); void save(); }} onChange={() => setFeedback('')}><h2>{ar ? 'تعديل المشروع' : 'Edit project'}</h2><fieldset disabled={busy}>
    {(['ar', 'en'] as const).map(language => <label key={language}>{ar ? 'اسم المشروع' : 'Project name'} {language.toUpperCase()}<input value={name[language]} onChange={event => setName(values => ({ ...values, [language]: event.target.value }))} /></label>)}
    {(['ar', 'en'] as const).map(language => <label key={language}>{ar ? 'وصف المشروع' : 'Project description'} {language.toUpperCase()}<textarea value={description[language]} onChange={event => setDescription(values => ({ ...values, [language]: event.target.value }))} /></label>)}
    <label>{ar ? 'الرابط المختصر' : 'Slug'}<input value={slug} pattern="[a-z0-9]+(-[a-z0-9]+)*" minLength={2} maxLength={120} required onChange={event => setSlug(event.target.value)} /></label>
    <label>{ar ? 'موقع المشروع (اختياري)' : 'Project website (optional)'}<input type="url" value={website} onChange={event => setWebsite(event.target.value)} /></label>
    <Button type="button" variant="secondary" aria-expanded={preview} onClick={() => setPreview(value => !value)}>{ar ? 'معاينة قبل الحفظ' : 'Preview before saving'}</Button>
    {preview ? <article className="admin-projects__detail-card" aria-label={ar ? 'معاينة المشروع' : 'Project preview'}><p>{ar ? 'معاينة بياناتك؛ لم تُحفظ بعد.' : 'Preview of your entries; not saved yet.'}</p><h3>{name[locale] || name.ar || name.en}</h3><p>{description[locale] || description.ar || description.en}</p><p>{website}</p></article> : null}
    <Button type="submit" loading={busy}>{ar ? 'حفظ التعديلات' : 'Save changes'}</Button>
    {feedback ? <p role={failed ? 'alert' : 'status'}>{feedback}</p> : null}
  </fieldset></form>;
}
