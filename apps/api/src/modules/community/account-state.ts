import { Types, type Connection } from 'mongoose';
import type { AccessTokenClaims } from '../auth/crypto.js';

export type CommunityAccountCheck = (claims: AccessTokenClaims) => Promise<boolean>;

export function createCommunityAccountCheck(connection: Connection): CommunityAccountCheck {
  return async claims => {
    if (!Types.ObjectId.isValid(claims.sub)) return false;
    const account = await connection.collection('users').findOne(
      { _id: new Types.ObjectId(claims.sub) }, { projection: { status: 1, roleType: 1 } },
    );
    return account?.status === 'verified' && account.roleType === claims.role;
  };
}
