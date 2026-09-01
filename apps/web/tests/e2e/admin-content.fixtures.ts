export const adminArticleId = 'aaaaaaaaaaaaaaaaaaaaaaaa';
export const adminArticleCategoryId = 'bbbbbbbbbbbbbbbbbbbbbbbb';

export function adminArticleFixture(status: 'draft' | 'pending_review' | 'published' | 'archived' = 'draft') {
  return {
    id: adminArticleId,
    categoryId: adminArticleCategoryId,
    slug: 'buying-in-sadat',
    title: { ar: 'دليل الشراء', en: 'Buying in Sadat',},
    body: { ar: 'محتوى المقال', en: 'Article body',},
    authorId: 'cccccccccccccccccccccccc',
    status,
    version: 3,
    createdAt: '2026-08-10T10:00:00.000Z',
    updatedAt: '2026-08-18T10:00:00.000Z',
    availableActions: status === 'draft' ? ['update', 'submit'] : status === 'pending_review' ? ['publish', 'return_to_draft'] : status === 'published' ? ['archive'] : ['restore']
  };
}

export function adminArticleCategoryFixture() {
  return {
    id: adminArticleCategoryId,
    slug: 'buying-tips',
    name: { ar: 'نصائح الشراء', en: 'Buying tips',},
    description: { ar: 'إرشادات', en: 'Guides',},
    displayOrder: 1,
    active: true,
    version: 2,
    createdAt: '2026-08-10T10:00:00.000Z',
    updatedAt: '2026-08-18T10:00:00.000Z',
    availableActions: ['update', 'delete']
  };
}
