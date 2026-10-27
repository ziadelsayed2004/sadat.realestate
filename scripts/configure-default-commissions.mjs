import { Types } from 'mongoose';
import { readEnvironmentFile } from './environment-file.mjs';
import { createDatabaseConnection } from '../apps/api/dist/modules/database/connection.js';
import { parseDatabaseEnvironment } from '../apps/api/dist/modules/database/environment.js';
import { parseRuntimeEnvironment } from '../apps/api/dist/modules/config/environment.js';
import { createAuditModels } from '../apps/api/dist/modules/audit/models.js';
import { createMongooseAuditWriter } from '../apps/api/dist/modules/audit/writer.js';
import { createMongooseCommissionPolicyRepository } from '../apps/api/dist/modules/commissions/policy-repository.js';
import { createCommissionPolicyService } from '../apps/api/dist/modules/commissions/policy-service.js';
import { setupAgreedCommissionDefaults } from '../apps/api/dist/modules/commissions/setup-defaults.js';

const apply = process.argv.includes('--apply');
const source = { ...await readEnvironmentFile(process.env.PRODUCTION_ENV_FILE ?? '/etc/elsadatrealestate/production.env'), ...Object.fromEntries(Object.entries(process.env).filter(([, value]) => value !== undefined)) };
const database = createDatabaseConnection(parseDatabaseEnvironment(source), parseRuntimeEnvironment(source).appEnvironment);
try {
  await database.connect();
  const connection = database.nativeConnection;
  const admin = await connection.collection('users').findOne({ normalizedEmail: 'info@elsadatrealestate.com', roleType: 'admin', status: 'verified', deletedAt: null }, { projection: { _id: 1 } });
  if (!admin || !await connection.collection('admin_bootstrap').findOne({ userId: admin._id, accessLevel: 'super_admin' })) throw new Error('CONFIRMED_SUPER_ADMIN_REQUIRED');
  const audit = createMongooseAuditWriter(createAuditModels(connection));
  const service = createCommissionPolicyService({ repository: createMongooseCommissionPolicyRepository(connection, audit) });
  const sub = admin._id instanceof Types.ObjectId ? admin._id.toHexString() : String(admin._id);
  const stamp = Math.floor(Date.now() / 1000);
  const claims = { iss: 'sadat-real-estate-api', aud: 'sadat-real-estate', sub, sid: sub, role: 'admin', status: 'verified', iat: stamp, exp: stamp + 60, jti: 'commission-initial-setup' };
  console.log(JSON.stringify({ status: apply ? 'applied' : 'preview', policies: await setupAgreedCommissionDefaults(service, claims, apply), developerAgreements: 'untouched' }, null, 2));
} catch {
  console.error('COMMISSION_SETUP_FAILED: check the confirmed main admin and existing policies; connection details were not printed.');
  process.exitCode = 1;
} finally { await database.disconnect(); }
