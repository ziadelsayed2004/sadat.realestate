import { http, HttpResponse } from 'msw';
import { publicHomepageSuccessEnvelopeSchema } from '@sadat-real-estate/contracts';

const publicHomeFixture = publicHomepageSuccessEnvelopeSchema.parse({
  data: {
    sections: [],
    categories: [],
    metrics: [],
    properties: [],
    developers: [],
    content: [],
    banners: []
  },
  meta: { requestId: 'test-public-home' }
});

export const publicHomeHandler = http.get(
  'http://sadat-real-estate.test/api/v1/public/home',
  () => HttpResponse.json(publicHomeFixture)
);

export const handlers = [publicHomeHandler,
  http.get('*/api/v1/public/bootstrap', () => HttpResponse.json({
    data: { defaultLocale: 'ar', supportedLocales: ['ar', 'en'], directions: { ar: 'rtl', en: 'ltr' }, display: {}, contact: {} },
    meta: { requestId: 'test-public-bootstrap' }
  })),
  http.get('*/api/v1/provider/properties/:propertyId/media', () => HttpResponse.json({
    data: { items: [] }, meta: { requestId: 'test-provider-media' }
  }))
];
