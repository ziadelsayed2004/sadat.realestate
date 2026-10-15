import { createHash } from 'node:crypto';
import { Types, type Connection } from 'mongoose';
import type { AccessTokenClaims } from '../auth/crypto.js';
import { unexpiredPropertyFilter } from '../settings/property-policy.js';

const calendar = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit' });
export function propertyViewDay(at: Date): string {
  const parts = calendar.formatToParts(at);
  return ['year', 'month', 'day'].map(type => parts.find(part => part.type === type)?.value).join('-');
}

export function createMongoosePropertyViews(connection: Connection, now = () => new Date()) {
  const events = connection.collection('property_view_events');
  const properties = connection.collection('properties');
  let indexes: Promise<unknown> | undefined;
  const ready = () => indexes ??= Promise.all([
    events.createIndex({ propertyId: 1, visitorHash: 1, day: 1 }, { unique: true }),
    events.createIndex({ providerId: 1, month: 1, propertyId: 1 }),
    events.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
  ]).catch(error => { indexes = undefined; throw error; });
  return {
    async record(slug: string, visitor: string, viewer?: AccessTokenClaims): Promise<boolean> {
      const at = now();
      const filter = { slug, status: 'published', active: true, ...unexpiredPropertyFilter(at) };
      const projection = { _id: 1, providerId: 1, viewCount: 1 };
      const property = await properties.findOne(filter, { projection });
      if (!property?.providerId || String(property.providerId) === viewer?.sub || viewer?.role === 'admin') return false;
      await ready();
      const day = propertyViewDay(at);
      const session = await connection.startSession();
      try {
        return await session.withTransaction(async () => {
          const current = await properties.findOne(filter, { projection, session });
          if (!current?.providerId || String(current.providerId) === viewer?.sub || viewer?.role === 'admin') return false;
          // Initialize legacy rows from retained events before counting the new visit.
          // The durable total then survives expiry of the short-lived visitor hashes.
          const previous = typeof current.viewCount === 'number' ? current.viewCount : await events.countDocuments({ propertyId: current._id }, { session });
          await events.insertOne({ propertyId: current._id, providerId: new Types.ObjectId(String(current.providerId)),
            visitorHash: createHash('sha256').update(visitor).digest('hex'), day, month: day.slice(0, 7),
            expiresAt: new Date(at.getTime() + 40 * 86_400_000) }, { session });
          await properties.updateOne({ _id: current._id }, { $set: { viewCount: previous + 1 } }, { session });
          return true;
        }) ?? false;
      } catch (error) {
        if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11000) return false;
        throw error;
      } finally {
        await session.endSession();
      }
    },
    async read(providerId: string, propertyIds: readonly string[] = []) {
      await ready();
      const filter = { providerId: new Types.ObjectId(providerId), month: propertyViewDay(now()).slice(0, 7) };
      const [monthlyViews, rows] = await Promise.all([
        events.countDocuments(filter),
        events.aggregate<{ _id: Types.ObjectId; count: number }>([
          { $match: { ...filter, propertyId: { $in: propertyIds.map(id => new Types.ObjectId(id)) } } },
          { $group: { _id: '$propertyId', count: { $sum: 1 } } }
        ]).toArray()
      ]);
      return { monthlyViews, propertyMonthlyViews: Object.fromEntries(propertyIds.map(id => [id, rows.find(row => String(row._id) === id)?.count ?? 0])) };
    }
  };
}
