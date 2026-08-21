export const adminCmsAboutId = 'aaaaaaaaaaaaaaaaaaaaaaaa';
export const adminCmsTeamId = 'bbbbbbbbbbbbbbbbbbbbbbbb';
export const adminCmsPopulationId = 'dddddddddddddddddddddddd';

const adminId = 'cccccccccccccccccccccccc';

export function adminCmsContentFor(namespace: 'about' | 'team' | 'population') {
  if (namespace === 'about') {
    return {
      namespace,
      items: [{
        id: adminCmsAboutId,
        key: 'mission',
        title: { ar: '\u0639\u0646 \u0627\u0644\u0645\u0646\u0635\u0629', en: 'About the platform', 'zh-CN': '\u5173\u4e8e\u5e73\u53f0' },
        body: { ar: '\u0645\u062d\u062a\u0648\u0649 \u0645\u0639\u062a\u0645\u062f', en: 'Approved content', 'zh-CN': '\u5df2\u6279\u51c6\u5185\u5bb9' },
        order: 1,
        active: true,
        status: 'published',
        updatedBy: adminId,
        version: 4,
        updatedAt: '2026-08-19T10:00:00.000Z',
        availableActions: ['update', 'deactivate']
      }]
    };
  }

  if (namespace === 'team') {
    return {
      namespace,
      items: [{
        id: adminCmsTeamId,
        key: 'lead',
        name: { ar: '\u0645\u062f\u064a\u0631 \u0627\u0644\u0645\u0646\u0635\u0629', en: 'Platform lead', 'zh-CN': '\u5e73\u53f0\u8d1f\u8d23\u4eba' },
        title: { ar: '\u0645\u062f\u064a\u0631', en: 'Director', 'zh-CN': '\u603b\u76d1' },
        bio: { ar: '\u0646\u0628\u0630\u0629 \u0645\u0639\u062a\u0645\u062f\u0629', en: 'Approved bio', 'zh-CN': '\u5df2\u6279\u51c6\u7b80\u4ecb' },
        order: 1,
        active: true,
        status: 'published',
        updatedBy: adminId,
        version: 2,
        updatedAt: '2026-08-19T10:00:00.000Z',
        availableActions: ['update']
      }]
    };
  }

  return {
    namespace,
    items: [{
      id: adminCmsPopulationId,
      status: 'available',
      value: 342000,
      sourceLabel: { ar: '\u0645\u0635\u062f\u0631 \u0645\u0639\u062a\u0645\u062f', en: 'Approved source', 'zh-CN': '\u5df2\u6279\u51c6\u6765\u6e90' },
      sourceUrl: 'https://example.test/population',
      asOf: '2026-08-01T00:00:00.000Z',
      reason: 'Approved source update',
      updatedBy: adminId,
      version: 3,
      updatedAt: '2026-08-19T10:00:00.000Z',
      availableActions: ['update']
    }]
  };
}

export function adminCmsEnvelope(data: unknown, requestId: string) {
  return {
    data,
    meta: { requestId }
  };
}
