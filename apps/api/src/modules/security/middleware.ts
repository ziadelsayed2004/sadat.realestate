import crypto from 'node:crypto';
import express, { type ErrorRequestHandler, type Request, type RequestHandler, type Response } from 'express';
import helmet from 'helmet';
import { ApiContractError, toApiErrorResponse } from '../contracts/error-boundary.js';

export interface RateLimitOptions {
  windowMs: number;
  max: number;
}

export interface SecurityOptions {
  allowedOrigins?: readonly string[];
  jsonBodyLimit?: string | number;
  urlEncodedBodyLimit?: string | number;
  rateLimit?: Partial<RateLimitOptions>;
  trustProxy?: boolean | number | string;
}

export interface ResolvedSecurityOptions {
  allowedOrigins: readonly string[];
  jsonBodyLimit: string | number;
  urlEncodedBodyLimit: string | number;
  rateLimit: RateLimitOptions;
  trustProxy: boolean | number | string;
}

const DEFAULT_SECURITY_OPTIONS: ResolvedSecurityOptions = Object.freeze({
  allowedOrigins: [],
  jsonBodyLimit: '1mb',
  urlEncodedBodyLimit: '100kb',
  rateLimit: Object.freeze({ windowMs: 60_000, max: 100 }),
  trustProxy: false
});

export function resolveSecurityOptions(options: SecurityOptions = {}): ResolvedSecurityOptions {
  const rateLimit = {
    windowMs: options.rateLimit?.windowMs ?? DEFAULT_SECURITY_OPTIONS.rateLimit.windowMs,
    max: options.rateLimit?.max ?? DEFAULT_SECURITY_OPTIONS.rateLimit.max
  };
  if (!Number.isSafeInteger(rateLimit.windowMs) || rateLimit.windowMs < 1) {
    throw new Error('Security rate-limit window must be a positive integer');
  }
  if (!Number.isSafeInteger(rateLimit.max) || rateLimit.max < 1) {
    throw new Error('Security rate-limit max must be a positive integer');
  }
  const allowedOrigins = [...(options.allowedOrigins ?? [])].map((origin) => origin.trim()).filter(Boolean);
  if (allowedOrigins.some((origin) => origin === '*')) {
    throw new Error('Wildcard CORS origins are not permitted');
  }
  return Object.freeze({
    allowedOrigins: Object.freeze(allowedOrigins),
    jsonBodyLimit: options.jsonBodyLimit ?? DEFAULT_SECURITY_OPTIONS.jsonBodyLimit,
    urlEncodedBodyLimit: options.urlEncodedBodyLimit ?? DEFAULT_SECURITY_OPTIONS.urlEncodedBodyLimit,
    rateLimit: Object.freeze(rateLimit),
    trustProxy: options.trustProxy ?? DEFAULT_SECURITY_OPTIONS.trustProxy
  });
}

function requestId(request: Request): string {
  const supplied = request.get('x-request-id')?.trim();
  return supplied && /^[^\s\u0000-\u001f\u007f]{1,128}$/.test(supplied) ? supplied : crypto.randomUUID();
}

function sendSecurityError(
  request: Request,
  response: Response,
  code: string,
  messageKey: string,
  statusCode: number,
  details: { path: Array<string | number>; code: string; messageKey: string }[] = []
): void {
  const mapped = toApiErrorResponse(new ApiContractError(code, messageKey, statusCode, details), requestId(request));
  response.status(mapped.statusCode).json(mapped.body);
}

function createCorsMiddleware(allowedOrigins: readonly string[]): RequestHandler {
  const origins = new Set(allowedOrigins);
  return (request, response, next) => {
    const origin = request.get('origin');
    if (!origin) {
      next();
      return;
    }
    response.vary('Origin');
    if (!origins.has(origin)) {
      if (request.method === 'OPTIONS') {
        sendSecurityError(request, response, 'CORS_ORIGIN_NOT_ALLOWED', 'errors.corsOriginNotAllowed', 403);
        return;
      }
      next();
      return;
    }
    response.setHeader('Access-Control-Allow-Origin', origin);
    response.setHeader('Access-Control-Allow-Credentials', 'true');
    response.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-Request-Id, X-Document-Category, X-File-Name'
    );
    response.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    if (request.method === 'OPTIONS') {
      response.status(204).end();
      return;
    }
    next();
  };
}

function createRateLimitMiddleware(options: RateLimitOptions): RequestHandler {
  const buckets = new Map<string, { count: number; resetAt: number }>();
  return (request, response, next) => {
    if (request.path === '/health' || request.path === '/ready') {
      next();
      return;
    }
    const now = Date.now();
    const key = request.ip || request.socket.remoteAddress || 'unknown';
    const current = buckets.get(key);
    const bucket = !current || current.resetAt <= now
      ? { count: 0, resetAt: now + options.windowMs }
      : current;
    bucket.count += 1;
    buckets.set(key, bucket);
    response.setHeader('RateLimit-Limit', String(options.max));
    response.setHeader('RateLimit-Remaining', String(Math.max(0, options.max - bucket.count)));
    response.setHeader('RateLimit-Reset', String(Math.ceil((bucket.resetAt - now) / 1000)));
    if (bucket.count > options.max) {
      response.setHeader('Retry-After', String(Math.ceil((bucket.resetAt - now) / 1000)));
      sendSecurityError(request, response, 'RATE_LIMITED', 'errors.rateLimited', 429);
      return;
    }
    next();
  };
}

function unsafePath(value: unknown, path: Array<string | number> = []): Array<string | number> | undefined {
  if (value === null || typeof value !== 'object') return undefined;
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const found = unsafePath(value[index], [...path, index]);
      if (found) return found;
    }
    return undefined;
  }
  for (const [key, nested] of Object.entries(value)) {
    if (key.startsWith('$') || key.includes('.') || key === '__proto__' || key === 'constructor' || key === 'prototype') {
      return [...path, key];
    }
    const found = unsafePath(nested, [...path, key]);
    if (found) return found;
  }
  return undefined;
}

function createSanitizationMiddleware(): RequestHandler {
  return (request, response, next) => {
    const locations: Array<[string, unknown]> = [
      ['body', request.body],
      ['query', request.query],
      ['params', request.params]
    ];
    for (const [location, value] of locations) {
      const found = unsafePath(value, [location]);
      if (found) {
        sendSecurityError(request, response, 'UNSAFE_INPUT', 'errors.unsafeInput', 400, [{
          path: [location],
          code: 'UNSAFE_INPUT',
          messageKey: 'errors.unsafeInput'
        }]);
        return;
      }
    }
    next();
  };
}

export function createSecurityMiddleware(options: SecurityOptions = {}): RequestHandler[] {
  const resolved = resolveSecurityOptions(options);
  return [
    helmet(),
    createCorsMiddleware(resolved.allowedOrigins),
    createRateLimitMiddleware(resolved.rateLimit),
    express.json({ limit: resolved.jsonBodyLimit, strict: true }),
    express.urlencoded({ limit: resolved.urlEncodedBodyLimit, extended: false }),
    createSanitizationMiddleware()
  ];
}

export function createSecurityErrorHandler(): ErrorRequestHandler {
  return (error, request, response, next) => {
    if (response.headersSent) {
      next(error);
      return;
    }
    if (error?.type === 'entity.too.large') {
      sendSecurityError(request, response, 'PAYLOAD_TOO_LARGE', 'errors.payloadTooLarge', 413);
      return;
    }
    if (error?.type === 'entity.parse.failed') {
      sendSecurityError(request, response, 'MALFORMED_JSON', 'errors.malformedJson', 400);
      return;
    }
    sendSecurityError(request, response, 'INTERNAL_ERROR', 'errors.internal', 500);
  };
}
