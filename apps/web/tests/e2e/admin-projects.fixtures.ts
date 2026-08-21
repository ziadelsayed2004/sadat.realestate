export const adminProjectId = 'aaaaaaaaaaaaaaaaaaaaaaaa';

export function adminProjectFixture() {
  return {
    id: adminProjectId,
    providerId: 'bbbbbbbbbbbbbbbbbbbbbbbb',
    name: { ar: 'مشروع النيل', en: 'Nile Heights', 'zh-CN': '尼罗高地' },
    slug: 'nile-heights',
    description: { en: 'A reviewed project.' },
    status: 'pending_review',
    version: 3,
    submittedAt: '2026-08-17T10:00:00.000Z',
    createdAt: '2026-08-10T10:00:00.000Z',
    updatedAt: '2026-08-18T10:00:00.000Z',
    availableActions: ['needs_changes', 'approve', 'reject']
  };
}
