import { readFile } from 'node:fs/promises';
import mongoose, { Types } from 'mongoose';
import { parseEnvironmentFile } from './environment-file.mjs';

// Read-only diagnostics. Never print email, passwords, hashes, or tokens.
const args = process.argv.slice(2);
if (args.includes('--help')) {
  console.log('node scripts/check-provider-login.mjs --env-file path --provider-id ObjectId\nRead-only: account/application status and credential presence; no secrets or writes.');
} else {
  let connection;
  try {
    const option = name => { const index = args.indexOf(name); return index < 0 ? undefined : args[index + 1]; };
    const id = option('--provider-id');
    if (!id || !/^[a-f0-9]{24}$/u.test(id)) throw new Error('INVALID_PROVIDER_ID');
    const envFile = option('--env-file');
    const environment = envFile ? parseEnvironmentFile(await readFile(envFile, 'utf8')) : process.env;
    if (!environment.MONGODB_URI) throw new Error('MONGODB_URI_REQUIRED');
    connection = await mongoose.createConnection(environment.MONGODB_URI, { serverSelectionTimeoutMS: 10000 }).asPromise();
    const objectId = new Types.ObjectId(id);
    let application = await connection.collection('provider_applications').findOne({ _id: objectId }, { projection: { userId: 1, status: 1 } });
    let profile = await connection.collection('provider_profiles').findOne({ _id: objectId }, { projection: { userId: 1, status: 1 } });
    const userId = application?.userId ?? profile?.userId ?? objectId;
    const user = await connection.collection('users').findOne({ _id: userId, roleType: 'provider' }, { projection: { status: 1 } });
    if (!user) throw new Error('PROVIDER_NOT_FOUND');
    application ??= await connection.collection('provider_applications').findOne({ userId }, { projection: { status: 1 } });
    profile ??= await connection.collection('provider_profiles').findOne({ userId }, { projection: { status: 1 } });
    const credential = await connection.collection('admin_credentials').findOne({ userId, passwordHash: { $type: 'string', $ne: '' } }, { projection: { _id: 1 } });
    console.log(JSON.stringify({ accountStatus: user.status, applicationStatus: application?.status, profileStatus: profile?.status,
      passwordCredentialPresent: Boolean(credential),
      recommendedAction: !credential ? 'RECOVER_PASSWORD_WITH_OTP' : user.status === 'verified' ? 'VERIFY_PASSWORD_OR_USE_OTP_RECOVERY' : 'REVIEW_ACCOUNT_STATUS'
    }, null, 2));
  } catch {
    console.error('PROVIDER_LOGIN_DIAGNOSTIC_FAILED: check the environment path, provider ID, and database access.');
    process.exitCode = 1;
  } finally { if (connection) await connection.close(); }
}
