import { AsyncLocalStorage } from 'node:async_hooks';
import { randomBytes, randomUUID } from 'node:crypto';

export interface RequestContext {
  requestId: string;
  traceId: string;
  spanId: string;
  traceFlags: string;
}

export interface RequestContextInput {
  requestId?: string | undefined;
  traceparent?: string | undefined;
}

export interface RequestContextFactories {
  requestId: () => string;
  traceId: () => string;
  spanId: () => string;
}

const requestContextStorage = new AsyncLocalStorage<RequestContext>();
const requestIdPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const traceparentPattern = /^00-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$/;
const allZeroTraceId = /^0{32}$/;
const allZeroSpanId = /^0{16}$/;

const defaultFactories: RequestContextFactories = {
  requestId: randomUUID,
  traceId: () => randomBytes(16).toString('hex'),
  spanId: () => randomBytes(8).toString('hex')
};

function validGeneratedHex(value: string, length: number): boolean {
  return new RegExp(`^[0-9a-f]{${length}}$`).test(value) && !new RegExp(`^0{${length}}$`).test(value);
}

function generatedValue(factory: () => string, kind: 'requestId' | 'traceId' | 'spanId'): string {
  const value = factory();
  const valid = kind === 'requestId'
    ? requestIdPattern.test(value)
    : validGeneratedHex(value, kind === 'traceId' ? 32 : 16);
  if (!valid) throw new Error(`Observability ${kind} factory returned an invalid value`);
  return value;
}

function parseTraceparent(value: string | undefined): Pick<RequestContext, 'traceId' | 'traceFlags'> | undefined {
  const match = value?.trim().match(traceparentPattern);
  const traceId = match?.[1];
  const parentSpanId = match?.[2];
  const traceFlags = match?.[3];
  if (!traceId || !parentSpanId || !traceFlags || allZeroTraceId.test(traceId) || allZeroSpanId.test(parentSpanId)) {
    return undefined;
  }
  return { traceId, traceFlags };
}

export function createRequestContext(
  input: RequestContextInput = {},
  factories: Partial<RequestContextFactories> = {}
): RequestContext {
  const resolvedFactories = { ...defaultFactories, ...factories };
  const parent = parseTraceparent(input.traceparent);
  const requestId = input.requestId?.trim();
  return Object.freeze({
    requestId: requestId && requestIdPattern.test(requestId)
      ? requestId
      : generatedValue(resolvedFactories.requestId, 'requestId'),
    traceId: parent?.traceId ?? generatedValue(resolvedFactories.traceId, 'traceId'),
    spanId: generatedValue(resolvedFactories.spanId, 'spanId'),
    traceFlags: parent?.traceFlags ?? '01'
  });
}

export function formatTraceparent(context: RequestContext): string {
  return `00-${context.traceId}-${context.spanId}-${context.traceFlags}`;
}

export function runWithRequestContext<TResult>(context: RequestContext, callback: () => TResult): TResult {
  return requestContextStorage.run(context, callback);
}

export function getRequestContext(): RequestContext | undefined {
  return requestContextStorage.getStore();
}
