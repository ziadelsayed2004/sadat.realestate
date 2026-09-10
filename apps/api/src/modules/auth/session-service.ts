import {
  authManagedSessionListDataSchema,
  authSessionIdParamsSchema,
  authSessionRevocationDataSchema,
  type AuthManagedSessionListData,
  type AuthRoleType,
  type AuthSessionRevocationData
} from '@sadat-real-estate/contracts';

export interface SessionPrincipal {
  userId: string;
  sessionId: string;
  roleType: AuthRoleType;
}

export interface SessionRequestContext {
  requestId: string;
  traceId: string;
}

export interface ManagedSessionRecord {
  id: string;
  authenticationMethod: 'password' | 'otp' | 'mfa';
  createdAt: Date;
  lastUsedAt?: Date;
  expiresAt: Date;
}

export interface SessionManagementRepository {
  listActive(userId: string, now: Date): Promise<readonly ManagedSessionRecord[]>;
  revokeOwned(input: {
    userId: string;
    sessionId: string;
    roleType: AuthRoleType;
    requestId: string;
    traceId: string;
    now: Date;
  }): Promise<'revoked' | 'not_found'>;
}

export type SessionManagementErrorCode = 'SESSION_NOT_FOUND' | 'CURRENT_SESSION_LOGOUT_REQUIRED';

export class SessionManagementError extends Error {
  constructor(readonly code: SessionManagementErrorCode) {
    super(code);
    this.name = 'SessionManagementError';
  }
}

export interface SessionManagementService {
  list(principal: SessionPrincipal): Promise<AuthManagedSessionListData>;
  revoke(principal: SessionPrincipal, sessionId: unknown, context: SessionRequestContext): Promise<AuthSessionRevocationData>;
}

export function createSessionManagementService(
  repository: SessionManagementRepository,
  now: () => Date = () => new Date()
): SessionManagementService {
  return {
    async list(principal) {
      const sessions = await repository.listActive(principal.userId, now());
      return authManagedSessionListDataSchema.parse({
        items: sessions.map(session => ({
          id: session.id,
          current: session.id === principal.sessionId,
          authenticationMethod: session.authenticationMethod,
          createdAt: session.createdAt.toISOString(),
          lastUsedAt: session.lastUsedAt?.toISOString() ?? null,
          expiresAt: session.expiresAt.toISOString()
        }))
      });
    },

    async revoke(principal, input, context) {
      const { sessionId } = authSessionIdParamsSchema.parse({ sessionId: input });
      if (sessionId === principal.sessionId) {
        throw new SessionManagementError('CURRENT_SESSION_LOGOUT_REQUIRED');
      }
      const result = await repository.revokeOwned({
        userId: principal.userId,
        sessionId,
        roleType: principal.roleType,
        requestId: context.requestId,
        traceId: context.traceId,
        now: now()
      });
      if (result === 'not_found') throw new SessionManagementError('SESSION_NOT_FOUND');
      return authSessionRevocationDataSchema.parse({ sessionId, revoked: true });
    }
  };
}
