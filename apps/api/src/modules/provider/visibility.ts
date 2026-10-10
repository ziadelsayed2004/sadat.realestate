import { Types, type Connection } from 'mongoose';
import type { ProviderType } from '@sadat-real-estate/contracts';
import { createMongooseProviderCommissionSource } from './commission-repository.js';

export interface ProviderVisibility {
  accountId?: string; providerType?: ProviderType; approved: boolean;
  publicIdentity: boolean; customerIdentity: boolean; contact: boolean;
}
export interface ProviderVisibilityReader { read(providerId: string): Promise<ProviderVisibility>; }
const hidden: ProviderVisibility = { approved: false, publicIdentity: false, customerIdentity: false, contact: false };
export function identitySubscriptionActive(row: Record<string, unknown> | null, at: Date): boolean {
  return row?.status === 'active' && row.paymentConfirmed === true && row.startAt instanceof Date && row.endAt instanceof Date && row.startAt <= at && at < row.endAt;
}
export function providerVisibility(input: { accountId: string; providerType: ProviderType; approved: boolean; acknowledged: boolean; subscribed: boolean }): ProviderVisibility {
  const developer = input.approved && input.providerType === 'developer_company' && input.acknowledged;
  return { accountId: input.accountId, providerType: input.providerType, approved: input.approved,
    publicIdentity: developer || input.approved && input.providerType === 'brokerage_office' && input.subscribed,
    customerIdentity: developer, contact: developer };
}
export function createProviderVisibilityReader(connection: Connection, now: () => Date = () => new Date()): ProviderVisibilityReader {
  const commission = createMongooseProviderCommissionSource(connection);
  return { async read(providerId) {
    if (!/^[a-f0-9]{24}$/.test(providerId)) return hidden;
    const key = new Types.ObjectId(providerId);
    const [application, profileById] = await Promise.all([
      connection.collection('provider_applications').findOne({ $or: [{ _id: key }, { userId: key }] }, { projection: { userId: 1, providerType: 1, status: 1 } }),
      connection.collection('provider_profiles').findOne({ $or: [{ _id: key }, { userId: key }] }, { projection: { userId: 1, providerType: 1, status: 1 } })
    ]);
    const accountId = application?.userId ?? profileById?.userId;
    if (!(accountId instanceof Types.ObjectId)) return hidden;
    const [profile, account, app] = await Promise.all([
      profileById ?? connection.collection('provider_profiles').findOne({ userId: accountId }, { projection: { status: 1, providerType: 1 } }),
      connection.collection('users').findOne({ _id: accountId, roleType: 'provider', deletedAt: { $exists: false } }, { projection: { status: 1 } }),
      application ?? connection.collection('provider_applications').findOne({ userId: accountId }, { projection: { status: 1, providerType: 1 } })
    ]);
    const providerType = app?.providerType;
    if (!['individual_broker', 'brokerage_office', 'developer_company'].includes(String(providerType)) || profile?.providerType !== providerType) return hidden;
    const approved = app?.status === 'approved' && profile?.status === 'approved' && account?.status === 'verified';
    let acknowledged = false; let subscribed = false;
    if (approved && providerType === 'developer_company') {
      const current = await commission.getForProvider(accountId.toHexString());
      if (current && current.source !== 'none' && current.sourceRecordId && current.sourceVersion !== undefined) {
        acknowledged = Boolean(await connection.collection('commission_confirmations').findOne({
          accountId: accountId.toHexString(), source: current.source, sourceRecordId: current.sourceRecordId,
          policyVersion: current.sourceVersion, status: 'acknowledged'
        }, { projection: { _id: 1 } }));
      }
    } else if (approved && providerType === 'brokerage_office') {
      subscribed = identitySubscriptionActive(await connection.collection('provider_identity_subscriptions').findOne({ _id: accountId }), now());
    }
    return providerVisibility({ accountId: accountId.toHexString(), providerType: providerType as ProviderType, approved, acknowledged, subscribed });
  } };
}
