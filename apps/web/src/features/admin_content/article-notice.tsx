import type { Article, SupportedLocale } from '@sadat-real-estate/contracts';

export function ArticleNotice({ article, locale }: { article: Article; locale: SupportedLocale }) {
  const ar = locale === 'ar';
  const text = article.status === 'draft' ? ar ? 'تم حفظ المقال كمسودة. يمكنك استكماله أو إرساله للمراجعة من بطاقته بالأسفل.' : 'Article saved as a draft. Continue editing or submit it for review using the card below.'
    : article.status === 'pending_review' ? ar ? 'تم إرسال المقال للمراجعة. بعد مراجعته، اضغط «نشر» من بطاقة المقال بالأسفل.' : 'Article submitted for review. After reviewing it, use Publish on the card below.'
      : article.status === 'published' ? ar ? 'المقال منشور وتم حفظ آخر تغيير بنجاح.' : 'The article is published and the latest change was saved successfully.'
        : ar ? 'تمت أرشفة المقال وإزالته من الموقع. يمكنك استعادته من بطاقته بالأسفل.' : 'Article archived and removed from the website. Restore it using the card below.';
  return <div className="admin-article-notice" role="status"><strong>{article.title[locale] ?? article.title.ar ?? article.title.en}</strong><p>{text}</p>{article.status === 'published' ? <a href={`/articles/${encodeURIComponent(article.slug)}?lang=${locale}`}>{ar ? 'عرض المقال في الموقع' : 'View article on website'}</a> : null}</div>;
}
