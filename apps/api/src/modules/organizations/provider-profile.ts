import { Types, type ClientSession, type Connection } from 'mongoose';

/** Restore a missing public identity only from a coherently approved developer. */
export async function ensureDeveloperOrganization(connection: Connection, accountId: Types.ObjectId, now: Date, session: ClientSession) {
  const application = await connection.collection('provider_applications').findOne({ userId: accountId, providerType: 'developer_company', status: 'approved' }, { session });
  if (!application) return undefined;
  const profile = await connection.collection('provider_profiles').findOne({ userId: accountId, providerType: 'developer_company', status: 'approved' }, { session });
  if (!profile) return undefined;
  const account = await connection.collection('users').findOne({ _id: accountId, roleType: 'provider', status: 'verified', deletedAt: null }, { session, projection: { _id: 1 } });
  if (!account) return undefined;
  const ownerIds = [accountId, profile._id, application._id];
  const owners = [...ownerIds, ...ownerIds.map(value => value.toHexString())];
  const organizations = connection.collection('organizations');
  let organization = await organizations.findOne({ providerId: { $in: owners } }, { session });
  let created = false;
  if (!organization) {
    const name = [application.brandName, application.legalCompanyName, application.displayName].find(value => typeof value === 'string' && value.trim().length > 0);
    if (typeof name !== 'string' || name.trim().length > 200) return undefined;
    const result = await organizations.updateOne({ _id: profile._id }, { $setOnInsert: {
      providerId: profile._id, kind: 'developer_company', name: { ar: name.trim(), en: name.trim() },
      slug: `developer-${accountId.toHexString()}`, status: 'approved', version: 0, createdAt: now, updatedAt: now
    } }, { session, upsert: true });
    created = result.upsertedCount === 1;
    organization = await organizations.findOne({ _id: profile._id }, { session });
  }
  // Preserve existing review decisions and explicit associations.
  if (!organization || organization.kind !== 'developer_company' || organization.status !== 'approved') return undefined;
  let linked = 0;
  for (const collection of ['properties', 'projects']) {
    const result = await connection.collection(collection).updateMany({ providerId: { $in: owners }, organizationId: null }, {
      $set: { organizationId: organization._id, ...(collection === 'properties' ? { sourceType: 'developer_company' } : {}), updatedAt: now }, $inc: { version: 1 }
    }, { session });
    linked += result.modifiedCount;
  }
  if (created || linked > 0) await connection.collection('organization_reconciliations').insertOne({
    accountId, organizationId: organization._id, source: 'approved_developer_application', created, linked, occurredAt: now
  }, { session });
  return { organizationId: organization._id.toHexString(), created, linked };
}

/** Idempotent startup repair for previously approved developer accounts. */
export async function initializeDeveloperOrganizations(connection: Connection, now = new Date()): Promise<void> {
  await connection.collection('organizations').createIndex({ providerId: 1 }, { name: 'organization_provider_lookup' });
  await connection.collection('organization_reconciliations').createIndex({ accountId: 1 }, { name: 'organization_reconciliation_account' });
  const applications = connection.collection('provider_applications').find({ providerType: 'developer_company', status: 'approved' }, { projection: { userId: 1 } }).batchSize(100);
  for await (const application of applications) {
    if (!(application.userId instanceof Types.ObjectId)) continue;
    await connection.transaction(session => ensureDeveloperOrganization(connection, application.userId as Types.ObjectId, now, session));
  }
}

export async function developerOrganizationId(connection: Connection, accountId: string, session: ClientSession): Promise<Types.ObjectId | undefined> {
  const key = new Types.ObjectId(accountId);
  const profile = await connection.collection('provider_profiles').findOne({ userId: key, providerType: 'developer_company', status: 'approved' }, { session, projection: { _id: 1 } });
  if (!profile) return undefined;
  const application = await connection.collection('provider_applications').findOne({ userId: key, providerType: 'developer_company', status: 'approved' }, { session, projection: { _id: 1 } });
  if (!application) return undefined;
  const ids = [key, profile._id, application._id];
  const organization = await connection.collection('organizations').findOne({ providerId: { $in: [...ids, ...ids.map(value => value.toHexString())] }, kind: 'developer_company', status: 'approved' }, { session, projection: { _id: 1 } });
  return organization?._id;
}
