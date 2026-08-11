import {
  createErrorEnvelope,
  type ApiError,
  type ErrorDetail,
  type ErrorEnvelope
} from '@sadat-real-estate/contracts';
import { ZodError } from 'zod';

export const API_ERROR_STATUS = {
  VALIDATION_FAILED: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  RESOURCE_NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  SERVICE_UNAVAILABLE: 503,
  INTERNAL_ERROR: 500
} as const;

export type ApiErrorCode = keyof typeof API_ERROR_STATUS;

export class ApiContractError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly messageKey: string;
  readonly details: readonly ErrorDetail[];

  constructor(
    code: string,
    messageKey: string,
    statusCode: number,
    details: readonly ErrorDetail[] = []
  ) {
    super(messageKey);
    this.name = 'ApiContractError';
    this.code = code;
    this.messageKey = messageKey;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export interface ApiErrorResponse {
  statusCode: number;
  body: ErrorEnvelope;
}

function validationDetails(error: ZodError): ErrorDetail[] {
  return error.issues.map((issue) => ({
    path: issue.path.filter((segment): segment is string | number => typeof segment === 'string' || typeof segment === 'number'),
    code: 'VALIDATION_FAILED',
    messageKey: 'errors.invalidInput'
  }));
}

function safeApiError(error: ApiContractError, requestId: string): ApiErrorResponse {
  const apiError: ApiError = {
    code: error.code,
    messageKey: error.messageKey,
    details: [...error.details],
    requestId
  };
  return { statusCode: error.statusCode, body: createErrorEnvelope(apiError) };
}

export function toApiErrorResponse(error: unknown, requestId: string): ApiErrorResponse {
  if (error instanceof ApiContractError) return safeApiError(error, requestId);

  if (error instanceof ZodError) {
    return {
      statusCode: API_ERROR_STATUS.VALIDATION_FAILED,
      body: createErrorEnvelope({
        code: 'VALIDATION_FAILED',
        messageKey: 'errors.invalidInput',
        details: validationDetails(error),
        requestId
      })
    };
  }

  return {
    statusCode: API_ERROR_STATUS.INTERNAL_ERROR,
    body: createErrorEnvelope({
      code: 'INTERNAL_ERROR',
      messageKey: 'errors.internal',
      details: [],
      requestId
    })
  };
}
