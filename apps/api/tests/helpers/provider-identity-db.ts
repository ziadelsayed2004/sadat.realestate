import { Types, type Connection } from 'mongoose';
export const account = new Types.ObjectId('1'.repeat(24)), application = new Types.ObjectId('2'.repeat(24)), profile = new Types.ObjectId('3'.repeat(24)), policyId = new Types.ObjectId('4'.repeat(24));
const equal = (left: unknown, right: unknown) => String(left) === String(right);
function matches(row: Record<string, unknown>, query: Record<string, unknown>): boolean {
  return Object.entries(query).every(([key, expected]) => {
    if (key === '$and') return (expected as Record<string, unknown>[]).every(value => matches(row, value));
    if (key === '$or') return (expected as Record<string, unknown>[]).some(value => matches(row, value));
    const value = key.split('.').reduce<unknown>((current, part) => current && typeof current === 'object' ? (current as Record<string, unknown>)[part] : undefined, row);
    if (expected instanceof RegExp) return typeof value === 'string' && expected.test(value);
    if (expected && typeof expected === 'object' && !(expected instanceof Types.ObjectId)) {
      const operator = expected as Record<string, unknown>;
      if ('$not' in operator) return !matches({ value }, { value: operator.$not });
      if ('$lte' in operator) return value instanceof Date && operator.$lte instanceof Date && value <= operator.$lte;
      if ('$gt' in operator) return value instanceof Date && operator.$gt instanceof Date && value > operator.$gt;
      if ('$ne' in operator) return !equal(value, operator.$ne);
      if ('$exists' in operator) return (value !== undefined) === operator.$exists;
      if ('$in' in operator) return (operator.$in as unknown[]).some(item => equal(value, item));
    }
    return equal(value, expected);
  });
}
export function database(type = 'brokerage_office') {
  const rows: Record<string, Record<string, unknown>[]> = {
    provider_applications: [{ _id: application, userId: account, providerType: type, status: 'approved' }],
    provider_profiles: [{ _id: profile, userId: account, providerType: type, status: 'approved' }],
    users: [{ _id: account, roleType: 'provider', status: 'verified' }],
    provider_identity_subscriptions: [], commission_confirmations: [], commission_exceptions: [], commission_account_overrides: [],
    commission_policies: [{ _id: policyId, scope: { kind: 'default' }, status: 'active', version: 1, kind: 'percentage', percentageBps: 100, effectiveFrom: new Date('2020-01-01T00:00:00Z') }]
  };
  const connection = { collection(name: string) { const data = rows[name] ??= []; return {
    async findOne(query: Record<string, unknown>) { const row = data.find(row => matches(row, query)); return row ? { ...row } : null; },
    find(query: Record<string, unknown>) { let results = data.filter(row => matches(row, query)); return { sort(sort: Record<string, number>) { results.sort((a,b) => { for(const [key,direction] of Object.entries(sort)) { const difference = typeof a[key] === 'number' && typeof b[key] === 'number' ? (a[key] as number)-(b[key] as number) : String(a[key]).localeCompare(String(b[key])); if(difference)return difference*direction; } return 0; }); return this; }, skip(count: number) { results=results.slice(count); return this; }, limit(count: number) { results=results.slice(0,count); return this; }, toArray: async () => results, next: async () => results[0] }; },
    async insertOne(row: Record<string, unknown>) { if (data.some(value => equal(value._id, row._id))) throw Object.assign(new Error('duplicate'), { code: 11000 }); data.push(row); },
    async updateOne(query: Record<string, unknown>, update: { $set: Record<string, unknown> }) { const row = data.find(value => matches(value, query)); if (row) Object.assign(row, update.$set); return { matchedCount: row ? 1 : 0 }; }
  }; }, async startSession() { return { withTransaction: async (run: () => Promise<unknown>) => run(), endSession: async () => {} }; }, async transaction(run: (session: object) => Promise<unknown>) { return run({}); } } as unknown as Connection;
  return { rows, connection };
}
