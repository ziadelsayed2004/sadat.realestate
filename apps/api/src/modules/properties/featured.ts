import { z } from 'zod';
import { Types, type Connection } from 'mongoose';
import { ApiContractError } from '../contracts/error-boundary.js';
import type { AuditWriter } from '../audit/writer.js';
import type { RbacService } from '../rbac/service.js';
import type { PropertyMutationContext } from './service.js';

export function createFeaturedPropertyManager(connection: Connection, authorization: Pick<RbacService, 'authorize'> | undefined, audit: AuditWriter) {
  return async (actorId: string, id: string, raw: unknown, context: PropertyMutationContext) => {
    z.string().regex(/^[a-f0-9]{24}$/).parse(id);
    const input = z.object({ version: z.number().int().nonnegative(), featured: z.boolean(), order: z.number().int().min(0).max(100000).optional(), reason: z.string().trim().min(3).max(500) }).strict().parse(raw);
    if (!authorization || !await authorization.authorize(actorId, 'admin:properties.manage')) throw new ApiContractError('PROPERTY_FORBIDDEN', 'errors.forbidden', 403);
    return connection.transaction(async session => {
      const properties = connection.collection('properties'), key = new Types.ObjectId(id);
      const before = await properties.findOne({ _id: key }, { session });
      if (!before) throw new ApiContractError('PROPERTY_NOT_FOUND', 'errors.notFound', 404);
      if (before.version !== input.version) throw new ApiContractError('PROPERTY_VERSION_CONFLICT', 'errors.conflict', 409);
      const at = new Date();
      const order = input.order ?? 0;
      await properties.updateOne({ _id: key, version: input.version }, { $set: { featured: input.featured, featuredOrder: input.featured ? order : null, featuredAt: input.featured ? at : null, updatedAt: at }, $inc: { version: 1 } }, { session });
      await audit.record({ actorType: 'admin', actorId, targetType: 'property', targetId: id, action: 'property.featured', reason: input.reason, before: { featured: before.featured ?? false, order: before.featuredOrder }, after: { featured: input.featured, order, featuredAt: input.featured ? at.toISOString() : null }, ...context, occurredAt: at }, session);
      return { id, featured: input.featured, order, version: input.version + 1 };
    });
  };
}
