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
  let indexes: Promise<unknown> | undefined;
  const ready = () => indexes ??= Promise.all([
    events.createIndex({ propertyId: 1, visitorHash: 1, day: 1 }, { unique: true }),
    events.createIndex({ providerId: 1, month: 1, propertyId: 1 }),
    events.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
  ]).catch(error => { indexes = undefined; throw error; });
  return {
    async record(slug: string, visitor: string, viewer?: AccessTokenClaims): Promise<boolean> {
      const at = now();
      const property = await connection.collection('properties').findOne(
        { slug, status: 'published', active: true, ...unexpiredPropertyFilter(at) },
        { projection: { _id: 1, providerId: 1 } }
      );
      if (!property?.providerId || String(property.providerId) === viewer?.sub || viewer?.role === 'admin') return false;
      await ready();
      const day = propertyViewDay(at);
      try {
        // A unique index handles concurrent tabs and retries without increasing the count.
        await events.insertOne({ propertyId: property._id, providerId: new Types.ObjectId(String(property.providerId)),
          visitorHash: createHash('sha256').update(visitor).digest('hex'), day, month: day.slice(0, 7),
          expiresAt: new Date(at.getTime() + 40 * 86_400_000) });
        return true;
      } catch (error) {
        if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11000) return false;
        throw error;
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
