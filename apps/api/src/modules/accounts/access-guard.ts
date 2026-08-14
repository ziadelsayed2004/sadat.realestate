import type { Request, RequestHandler, Response } from 'express';
import type { AccessTokenService } from '../auth/crypto.js';
import { ApiContractError, toApiErrorResponse } from '../contracts/error-boundary.js';
import { getRequestContext } from '../observability/context.js';
import type { AccountRepository } from './repository.js';

function requestId(request: Request): string {
  return getRequestContext()?.requestId ?? request.get('x-request-id') ?? 'unknown-request';
}

function bearer(request: Request): string | undefined {
  const header = request.get('authorization')?.trim();
  if (!header || !/^Bearer\s+/i.test(header)) return undefined;
  return header.replace(/^Bearer\s+/i, '').trim() || undefined;
}

function reject(request: Request, response: Response): void {
  const mapped = toApiErrorResponse(
    new ApiContractError(
      'AUTHENTICATION_REQUIRED',
      'errors.authenticationRequired',
      401
    ),
    requestId(request)
  );
  response.status(mapped.statusCode).json(mapped.body);
}

export function createCurrentAccountAccessGuard(
  accessTokens: AccessTokenService,
  repository: Pick<AccountRepository, 'isAccessSessionCurrent'>,
  now: () => Date = () => new Date()
): RequestHandler {
  return async (request, response, next) => {
    const token = bearer(request);
    if (!token) {
      next();
      return;
    }
    try {
      const checkedAt = now();
      const claims = accessTokens.verify(token, checkedAt);
      if (
        claims.status === 'rejected'
        || claims.status === 'restricted'
        || claims.status === 'suspended'
      ) {
        reject(request, response);
        return;
      }
      if (!await repository.isAccessSessionCurrent({
        userId: claims.sub,
        sessionId: claims.sid,
        roleType: claims.role,
        status: claims.status,
        now: checkedAt
      })) {
        reject(request, response);
        return;
      }
      next();
    } catch {
      reject(request, response);
    }
  };
}
