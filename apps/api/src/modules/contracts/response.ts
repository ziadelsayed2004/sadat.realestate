import {
  createSuccessEnvelope,
  type ResponseMeta,
  type SuccessEnvelope
} from '@sadat-real-estate/contracts';

export function toSuccessResponse<TData>(
  data: TData,
  requestId: string,
  meta: Omit<ResponseMeta, 'requestId'> = {}
): SuccessEnvelope<TData> {
  return createSuccessEnvelope(data, requestId, meta);
}
