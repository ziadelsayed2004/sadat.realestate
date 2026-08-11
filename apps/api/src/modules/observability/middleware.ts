import type { Request, RequestHandler } from 'express';
import {
  createRequestContext,
  formatTraceparent,
  runWithRequestContext,
  type RequestContextFactories
} from './context.js';
import { createStructuredLogger, type StructuredLogger } from './logger.js';

export interface ObservabilityOptions {
  logger?: StructuredLogger;
  now?: () => number;
  contextFactories?: Partial<RequestContextFactories>;
}

function routePattern(request: Request): string {
  const route = request.route as { path?: unknown } | undefined;
  if (typeof route?.path !== 'string') return 'unmatched';
  return `${request.baseUrl}${route.path}` || '/';
}

function durationMilliseconds(startedAt: number, finishedAt: number): number {
  return Math.max(0, Math.round((finishedAt - startedAt) * 1000) / 1000);
}

export function createRequestObservabilityMiddleware(options: ObservabilityOptions = {}): RequestHandler {
  const logger = options.logger ?? createStructuredLogger();
  const now = options.now ?? (() => performance.now());

  return (request, response, next) => {
    const context = createRequestContext({
      requestId: request.get('x-request-id'),
      traceparent: request.get('traceparent')
    }, options.contextFactories);
    const startedAt = now();

    // Keep legacy/error helpers on the same canonical ID until all later routes use context directly.
    request.headers['x-request-id'] = context.requestId;
    response.setHeader('X-Request-Id', context.requestId);
    response.setHeader('Traceparent', formatTraceparent(context));

    runWithRequestContext(context, () => {
      let completed = false;
      response.once('finish', () => {
        completed = true;
        const statusCode = response.statusCode;
        const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
        logger.log(level, 'http.request.completed', {
          method: request.method,
          route: routePattern(request),
          statusCode,
          durationMs: durationMilliseconds(startedAt, now())
        }, context);
      });
      response.once('close', () => {
        if (completed) return;
        logger.warn('http.request.aborted', {
          method: request.method,
          route: routePattern(request),
          durationMs: durationMilliseconds(startedAt, now())
        }, context);
      });
      next();
    });
  };
}

