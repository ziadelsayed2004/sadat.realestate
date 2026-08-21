import type { Connection } from 'mongoose';
import type { AccessTokenService } from '../auth/crypto.js';
import type { AdvertisingLedgerAuthorization } from './advertising-ledger.js';
import { createAdvertisingLedgerService } from './advertising-ledger.js';
import { createMongooseAdvertisingFinancialSource } from './advertising-ledger-repository.js';
import type { AdvertisingLedgerRouterDependencies } from './advertising-ledger-router.js';

export function createAdvertisingLedgerRuntime(
  connection: Connection,
  accessTokens: AccessTokenService,
  authorization: AdvertisingLedgerAuthorization
): AdvertisingLedgerRouterDependencies {
  return {
    accessTokens,
    service: createAdvertisingLedgerService({
      authorization,
      source: createMongooseAdvertisingFinancialSource(connection)
    })
  };
}
