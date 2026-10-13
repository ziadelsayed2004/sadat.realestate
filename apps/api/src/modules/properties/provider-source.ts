import { Types, type Connection } from 'mongoose';
import type { StoredProperty } from './repository.js';

/** Resolve ownership from approved account records, never from form IDs. */
export function createProviderPropertySourceResolver(connection: Connection) {
  return async (accountId: string): Promise<StoredProperty['source'] | undefined> => {
    const key = new Types.ObjectId(accountId);
    return connection.transaction(async session => {
      const account = await connection.collection('users').findOne({ _id: key, roleType: 'provider', status: 'verified', deletedAt: null }, { session });
      const application = await connection.collection('provider_applications').findOne({ userId: key, status: 'approved' }, { session });
      const profile = await connection.collection('provider_profiles').findOne({ userId: key, status: 'approved' }, { session });
      const sourceType = application?.providerType;
      if (!account || !profile || profile.providerType !== sourceType) return undefined;
      if (sourceType === 'individual_broker') return { providerId: accountId, sourceType };
      if (sourceType !== 'brokerage_office' && sourceType !== 'developer_company') return undefined;
      const owners = [key, profile._id, application!._id];
      const organizations = connection.collection('organizations');
      let organization = await organizations.findOne({ providerId: { $in: [...owners, ...owners.map(value => value.toHexString())] } }, { session });
      if (!organization) {
        const name = [application!.brandName, application!.legalCompanyName, application!.legalBusinessName, application!.displayName].find(value => typeof value === 'string' && value.trim().length > 0);
        if (typeof name !== 'string' || name.trim().length > 200) return undefined;
        await organizations.updateOne({ _id: profile._id }, { $setOnInsert: {
          providerId: profile._id, kind: sourceType, name: { ar: name.trim(), en: name.trim() },
          slug: `${sourceType === 'developer_company' ? 'developer' : 'office'}-${accountId}`, status: 'approved', version: 0, createdAt: new Date(), updatedAt: new Date()
        } }, { session, upsert: true });
        organization = await organizations.findOne({ _id: profile._id }, { session });
      }
      if (!organization || organization.kind !== sourceType || organization.status !== 'approved' || !owners.some(owner => owner.toHexString() === String(organization.providerId))) return undefined;
      return { providerId: accountId, sourceType, organizationId: organization._id.toHexString() };
    });
  };
}
