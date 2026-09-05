import { publicPropertyListSuccessEnvelopeSchema, type PublicPropertyLocation } from '@sadat-real-estate/contracts';
import { ApiClient } from '../contracts/index.ts';

export async function loadProviderAccountLocations(): Promise<readonly PublicPropertyLocation[]> {
  const response = await new ApiClient().request('/public/properties', {
    responseSchema: publicPropertyListSuccessEnvelopeSchema,
    query: { page: 1, limit: 1 }
  });
  return response.data.data.locations ?? [];
}
