import type { LocalizedText, SupportedLocale } from '@sadat-real-estate/contracts';
import { localizedText } from './model.ts';
import { replaceLocaleInUrl } from '../localization/index.ts';

export function PropertyProjectLabel({ name, url, locale }: { name?: LocalizedText | undefined; url?: string | undefined; locale: SupportedLocale }) {
  const title = localizedText(name, locale);
  if (!title) return null;
  const text = `${locale === 'ar' ? 'ضمن مشروع' : 'Part of'}: ${title}`;
  return url?.startsWith('/developers/') ? <a className="public-property-project-label" href={replaceLocaleInUrl(url, locale)}>{text}</a> : <span className="public-property-project-label">{text}</span>;
}
