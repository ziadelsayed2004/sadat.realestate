import { Types, type Connection } from 'mongoose';
import { z } from 'zod';
import { ApiContractError } from '../contracts/error-boundary.js';
import type { AuditWriter } from '../audit/writer.js';
import type { RbacService, RbacMutationContext } from './service.js';

export function createRoleDeleter(connection: Connection, service: Pick<RbacService, 'authorize'>, audit: AuditWriter) {
  return async (actorId: string, roleId: string, raw: unknown, context: RbacMutationContext) => {
    const id = z.string().regex(/^[a-f0-9]{24}$/).parse(roleId);
    const input = z.object({ version: z.number().int().nonnegative(), reason: z.string().trim().min(3).max(500) }).strict().parse(raw);
    if (!await service.authorize(actorId, 'admin:roles.manage')) throw new ApiContractError('RBAC_FORBIDDEN', 'errors.forbidden', 403);
    return connection.transaction(async session => {
      const roles = connection.collection('roles'), key = new Types.ObjectId(id);
      const role = await roles.findOne({ _id: key }, { session });
      if (!role) throw new ApiContractError('RBAC_ROLE_NOT_FOUND', 'errors.notFound', 404);
      if ((role.version ?? 0) !== input.version) throw new ApiContractError('RBAC_ROLE_VERSION_CONFLICT', 'errors.conflict', 409);
      if (await connection.collection('admin_role_assignments').findOne({ roleIds: key }, { session })) throw new ApiContractError('RBAC_ROLE_ASSIGNED', 'errors.conflict', 409);
      await roles.deleteOne({ _id: key }, { session });
      await audit.record({ actorType: 'admin', actorId, targetType: 'rbac_role', targetId: id, action: 'rbac.role_deleted', reason: input.reason, before: { name: role.name, version: role.version }, after: { deleted: true }, ...context, occurredAt: new Date() }, session);
      return { id, deleted: true };
    });
  };
}
