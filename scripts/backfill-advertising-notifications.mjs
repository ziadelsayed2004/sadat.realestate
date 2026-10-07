import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import mongoose from 'mongoose';
import { parseEnvironmentFile } from './environment-file.mjs';
import { advertisingNotification } from '../apps/api/dist/modules/ads/notifications.js';

// Recover the current useful alert only, without replaying obsolete workflow stages.
export async function backfillAdvertisingNotifications(connection, { apply = false } = {}) {
  const requests = connection.collection('ad_requests');
  const notifications = connection.collection('notifications');
  const proofs = connection.collection('payment_proofs');
  const statuses = ['waiting_pricing', 'quote_sent', 'waiting_payment', 'scheduled'];
  let missing = 0; let inserted = 0;
  async function candidate(row, session) {
    let event = row.status === 'waiting_pricing' ? 'approved' : row.status === 'scheduled' ? row.paymentWaiver ? 'payment_waived' : 'scheduled' : row.status;
    let sourceId; let version = row.version; let reason; let occurredAt = row.updatedAt ?? row.createdAt;
    if (row.status === 'waiting_payment') {
      const proof = await proofs.findOne({ adRequestId: row._id, providerId: row.providerId, active: true }, { sort: { uploadedAt: -1, _id: -1 }, ...(session ? { session } : {}) });
      if (proof && ['uploaded', 'pending_review'].includes(proof.status)) return undefined;
      if (proof && ['approved', 'rejected'].includes(proof.status)) {
        event = proof.status === 'approved' ? 'payment_approved' : 'payment_rejected';
        sourceId = proof._id.toHexString(); version = proof.version;
        occurredAt = proof.reviewHistory?.at(-1)?.createdAt ?? occurredAt;
        if (proof.status === 'rejected') reason = proof.reviewHistory?.at(-1)?.reason;
      }
    }
    if (!(row.providerId instanceof mongoose.Types.ObjectId) || !Number.isInteger(version)) return undefined;
    const notification = advertisingNotification({ event, requestId: row._id.toHexString(), providerId: row.providerId.toHexString(), version, sourceId, reason, occurredAt });
    const existing = await notifications.findOne({ recipientId: row.providerId, audience: 'provider', type: notification.type, link: notification.link }, { projection: { _id: 1 }, ...(session ? { session } : {}) });
    return existing ? undefined : notification;
  }
  for await (const row of requests.find({ status: { $in: statuses } })) {
    if (!await candidate(row)) continue;
    missing++;
    if (!apply) continue;
    const session = await connection.startSession();
    try {
      const added = await session.withTransaction(async () => {
        const current = await requests.findOne({ _id: row._id, status: row.status, version: row.version }, { session });
        if (!current) return 0;
        const notification = await candidate(current, session);
        if (notification) {
          const result = await notifications.updateOne({ _id: notification._id }, { $setOnInsert: notification }, { upsert: true, session });
          return result.upsertedCount;
        }
        return 0;
      });
      inserted += added;
    } finally { await session.endSession(); }
  }
  return { mode: apply ? 'apply' : 'plan', missing, inserted };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help')) { console.log('node scripts/backfill-advertising-notifications.mjs [--env-file path] [--apply]\nDefault: read-only plan. Build the API first. Adds only missing in-app alerts for current advertising stages. No emails.'); return; }
  const envIndex = args.indexOf('--env-file');
  const file = envIndex >= 0 ? args[envIndex + 1] : process.env.PRODUCTION_ENV_FILE;
  if (envIndex >= 0 && !file) throw new Error('ENV_FILE_REQUIRED');
  const fileEnv = file ? parseEnvironmentFile(await readFile(file, 'utf8')) : {};
  const uri = process.env.MONGODB_URI ?? fileEnv.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI_REQUIRED');
  const connection = await mongoose.createConnection(uri, { serverSelectionTimeoutMS: 10000 }).asPromise();
  try { console.log(JSON.stringify(await backfillAdvertisingNotifications(connection, { apply: args.includes('--apply') }))); }
  finally { await connection.close(); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(() => { console.error('ADVERTISING_NOTIFICATION_BACKFILL_FAILED: check database access and replica-set configuration. No credentials are printed.'); process.exitCode = 1; });
}
