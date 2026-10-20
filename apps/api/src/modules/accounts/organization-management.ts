import { Types, type Connection } from 'mongoose';
import { z } from 'zod';
import { ApiContractError } from '../contracts/error-boundary.js';
import type { AccountAuthorization, AccountRequestContext } from './service.js';
import type { AuditWriter } from '../audit/writer.js';

const idSchema = z.string().regex(/^[a-f0-9]{24}$/);
const text = z.object({ ar: z.string().trim().max(200).optional(), en: z.string().trim().max(200).optional() }).refine(value => value.ar || value.en);
const photoUrl = z.string().regex(/^\/api\/v1\/public\/organization-photos\/[a-f0-9]{24}$/).nullable().optional();
const patch = z.object({ version: z.number().int().nonnegative(), name: text.optional(), description: z.object({ ar: z.string().max(5000).optional(), en: z.string().max(5000).optional() }).optional(), imageUrl: photoUrl, logoUrl: photoUrl, status: z.enum(['approved', 'inactive']).optional(), reason: z.string().trim().min(3).max(500) }).strict();
export function createOrganizationManager(connection: Connection, authorization: AccountAuthorization, audit: AuditWriter) {
  return async (actorId: string, providerId: string, raw?: unknown, context?: AccountRequestContext, owner = false) => {
    const key = new Types.ObjectId(idSchema.parse(providerId));
    if (owner ? actorId !== providerId : !await authorization.authorize(actorId, raw === undefined ? 'admin:providers.view' : 'admin:providers.visibility.manage')) throw new ApiContractError('FORBIDDEN', 'errors.forbidden', 403);
    return connection.transaction(async session => {
      const user = await connection.collection('users').findOne({ _id: key, roleType: 'provider', deletedAt: null }, { session });
      if (!user) throw new ApiContractError('NOT_FOUND', 'errors.notFound', 404);
      const profile = await connection.collection('provider_profiles').findOne({ userId: key }, { session });
      const application = await connection.collection('provider_applications').findOne({ userId: key }, { session });
      if (owner && (user.status !== 'verified' || application?.status !== 'approved' || application.providerType !== 'developer_company')) throw new ApiContractError('FORBIDDEN', 'errors.forbidden', 403);
      const owners = [key, profile?._id, application?._id].filter(Boolean);
      const organizations = connection.collection('organizations'), row = await organizations.findOne({ providerId: { $in: [...owners, ...owners.map(String)] } }, { session });
      if (!row) throw new ApiContractError('NOT_FOUND', 'errors.notFound', 404);
      const project = (record: typeof row) => ({ id: String(record._id), slug: record.slug, name: record.name, description: record.description ?? {}, imageUrl: record.imageUrl ?? '', logoUrl: record.logoUrl ?? '', status: record.status, version: record.version ?? 0 });
      if (raw === undefined) return project(row);
      const input = patch.parse(raw), { version, reason, ...changes } = input;
      if (owner && changes.status !== undefined) throw new ApiContractError('FORBIDDEN', 'errors.forbidden', 403);
      if ((row.version ?? 0) !== version) throw new ApiContractError('VERSION_CONFLICT', 'errors.conflict', 409);
      for (const imageUrl of [changes.imageUrl, changes.logoUrl]) {
        if (!imageUrl) continue;
        const assetId = imageUrl.split('/').at(-1)!;
        if (!await connection.collection('organization_photos').findOne({ _id: new Types.ObjectId(assetId), storageKey: { $type: 'string' }, ...(owner ? { createdBy: key } : {}) }, { session })) throw new ApiContractError('PHOTO_NOT_FOUND', 'errors.validation', 400);
      }
      const at = new Date();
      const savedChanges = { ...changes };
      if (changes.description) savedChanges.description = Object.fromEntries(Object.entries(changes.description).filter(([, value]) => value?.trim()).map(([lang, value]) => [lang, value!.trim()]));
      const clearDescription = savedChanges.description !== undefined && Object.keys(savedChanges.description).length === 0;
      if (clearDescription) delete savedChanges.description;
      await organizations.updateOne({ _id: row._id }, { $set: { ...savedChanges, updatedAt: at }, ...(clearDescription ? { $unset: { description: '' } } : {}), $inc: { version: 1 } }, { session });
      if (context) await audit.record({ actorType: owner ? 'provider' : 'admin', actorId, targetType: 'organization', targetId: String(row._id), action: changes.status === 'inactive' ? 'organization.remove_from_directory' : 'organization.update', reason, before: project(row), after: { ...project(row), ...changes, version: version + 1 }, ...context, occurredAt: at }, session);
      return { ...project(row), ...changes, version: version + 1 };
    });
  };
}
