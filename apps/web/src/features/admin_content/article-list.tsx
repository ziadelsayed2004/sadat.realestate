import { useEffect, useState } from 'react';
import type { Article, ArticleAvailableAction, ArticleCategory, SupportedLocale } from '@sadat-real-estate/contracts';
import { Button } from '../design_system/index.ts';
import { getAdminContentCopy } from './copy.ts';
import type { TeamPhotoLoader } from './team-photo.tsx';

function ArticleThumbnail({ article, locale, load }: { article: Article; locale: SupportedLocale; load: TeamPhotoLoader }) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    if (!article.coverAssetId) { setUrl(undefined); return undefined; }
    const controller = new AbortController();
    let allocated: string | undefined;
    setUrl(undefined);
    void load(article.coverAssetId, controller.signal).then(blob => { if (!controller.signal.aborted) { allocated = URL.createObjectURL(blob); setUrl(allocated); } }).catch(() => undefined);
    return () => { controller.abort(); if (allocated) URL.revokeObjectURL(allocated); };
  }, [article.coverAssetId, load]);
  const source = article.coverAssetId ? url : article.imageUrl;
  return <div className="admin-article-card__image">{source ? <img src={source} alt={article.title[locale] ?? article.title.ar ?? article.title.en ?? ''} /> : <span>{locale === 'ar' ? 'بدون معاينة صورة' : 'No image preview'}</span>}</div>;
}

export function ArticleList({ articles, categories, locale, load, onEdit, onTransition, onDelete }: { articles: readonly Article[]; categories: readonly ArticleCategory[]; locale: SupportedLocale; load: TeamPhotoLoader; onEdit: (article: Article) => void; onTransition: (article: Article, action: ArticleAvailableAction) => void; onDelete: (article: Article) => void }) {
  const copy = getAdminContentCopy(locale);
  return <div className="admin-article-list">{articles.map(article => {
    const category = categories.find(item => item.id === article.categoryId);
    const tone = article.status === 'published' ? 'success' : article.status === 'pending_review' ? 'warning' : article.status === 'draft' ? 'info' : 'neutral';
    return <article className="admin-article-card" key={article.id} data-testid={`admin-article-${article.id}`}>
      <ArticleThumbnail article={article} locale={locale} load={load} />
      <div className="admin-article-card__content"><h3>{article.title[locale] ?? article.title.ar ?? article.title.en}</h3><span className="admin-content__badge" data-tone={tone}>{copy.status[article.status]}</span>
        <p>{copy.category}: {category?.name[locale] ?? category?.name.ar ?? category?.name.en ?? '—'}</p>
        <small>{copy.updated}: {new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(article.updatedAt))} · {copy.version}: {article.version}</small>
        <div className="admin-content__row-actions">
          {article.availableActions.includes('update') ? <Button size="sm" onClick={() => onEdit(article)}>{copy.edit}</Button> : null}
          {article.availableActions.filter(action => action !== 'update' && action !== 'delete').map(action => <Button key={action} size="sm" variant="secondary" onClick={() => onTransition(article, action)}>{copy.action[action]}</Button>)}
          {article.status === 'published' ? <a className="ui-button ui-button--secondary ui-button--sm" href={`/articles/${encodeURIComponent(article.slug)}?lang=${locale}`}>{locale === 'ar' ? 'عرض المقال' : 'View article'}</a> : null}
          {article.availableActions.includes('delete') ? <Button size="sm" variant="danger" onClick={() => onDelete(article)}>{copy.action.delete}</Button> : null}
          {article.availableActions.length === 0 ? <span>{copy.noActions}</span> : null}
        </div>
      </div>
    </article>;
  })}</div>;
}
