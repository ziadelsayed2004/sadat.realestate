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

export const handlers = [publicHomeHandler];
