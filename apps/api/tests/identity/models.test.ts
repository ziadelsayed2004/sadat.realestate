import assert from 'node:assert/strict';
import test from 'node:test';
import mongoose, { type Model } from 'mongoose';
import {
  canTransitionAccountState,
  canTransitionProviderProfileState
} from '../../src/modules/identity/account-state.js';
import {
  createIdentityModels,
  type IdentityModels
} from '../../src/modules/identity/models.js';

function createModels(): IdentityModels {
  return createIdentityModels(mongoose.createConnection());
}

function indexByName(model: Model<unknown>, name: string) {
  return model.schema.indexes().find(([, options]) => options.name === name);
}

test('creates connection-scoped identity models idempotently', () => {
  const connection = mongoose.createConnection();
  const first = createIdentityModels(connection);
  const second = createIdentityModels(connection);
  assert.equal(first.User, second.User);
  assert.equal(first.Session, second.Session);
  assert.equal(first.User.collection.collectionName, 'users');
  assert.equal(first.ProviderProfile.collection.collectionName, 'provider_profiles');
});

test('normalizes approved email and E.164 identity candidates', async () => {
  const { User } = createModels();
  const user = new User({
    normalizedEmail: ' Person@Example.COM ',
    normalizedPhone: ' +201001234567 ',
    roleType: 'seeker'
  });
  await user.validate();
  assert.equal(user.normalizedEmail, 'person@example.com');
  assert.equal(user.normalizedPhone, '+201001234567');
  assert.equal(user.status, 'unverified');
  assert.equal(user.locale, 'ar');
});

test('rejects users without an identifier, malformed values, roles, states, or unknown fields', async () => {
  const { User } = createModels();
  await assert.rejects(new User({ roleType: 'seeker' }).validate(), /identifier/i);
  await assert.rejects(
    new User({ normalizedEmail: 'not-an-email', roleType: 'seeker' }).validate(),
    /normalizedEmail/
  );
  await assert.rejects(
    new User({ normalizedPhone: '01001234567', roleType: 'seeker' }).validate(),
    /normalizedPhone/
  );
  await assert.rejects(
    new User({ normalizedEmail: 'a@example.com', roleType: 'owner' }).validate(),
    /roleType/
  );
  assert.throws(
    () => new User({ normalizedEmail: 'a@example.com', roleType: 'admin', password: 'unsafe' }),
    /strict mode/
  );
});

test('declares partial identifier uniqueness and role/status lookup indexes', () => {
  const { User } = createModels();
  const email = indexByName(User, 'users_normalized_email_unique');
  const phone = indexByName(User, 'users_normalized_phone_unique');
  assert.deepEqual(email?.[0], { normalizedEmail: 1 });
  assert.equal(email?.[1].unique, true);
  assert.deepEqual(email?.[1].partialFilterExpression, {
    normalizedEmail: { $type: 'string' }
  });
  assert.deepEqual(phone?.[0], { normalizedPhone: 1 });
  assert.equal(phone?.[1].unique, true);
  assert.ok(indexByName(User, 'users_role_status'));
});

test('validates seeker, provider, and admin profiles with unique user ownership', async () => {
  const { SeekerProfile, ProviderProfile, AdminProfile } = createModels();
  const userId = new mongoose.Types.ObjectId();
  await new SeekerProfile({ userId }).validate();
  await new AdminProfile({ userId }).validate();
  const provider = new ProviderProfile({ userId, providerType: 'development_company' });
  await provider.validate();
  assert.equal(provider.status, 'draft');
  await assert.rejects(
    new ProviderProfile({ userId, providerType: 'unapproved_type' }).validate(),
    /providerType/
  );
  assert.equal(indexByName(SeekerProfile, 'seeker_profiles_user_unique')?.[1].unique, true);
  assert.equal(indexByName(ProviderProfile, 'provider_profiles_user_unique')?.[1].unique, true);
  assert.equal(indexByName(AdminProfile, 'admin_profiles_user_unique')?.[1].unique, true);
  assert.ok(indexByName(ProviderProfile, 'provider_profiles_status_updated'));
});

test('enforces approved account and provider state transitions', () => {
  assert.equal(canTransitionAccountState('unverified', 'pending_review'), true);
  assert.equal(canTransitionAccountState('pending_review', 'verified'), true);
  assert.equal(canTransitionAccountState('verified', 'suspended'), true);
  assert.equal(canTransitionAccountState('unverified', 'verified'), false);
  assert.equal(canTransitionAccountState('rejected', 'verified'), false);
  assert.equal(canTransitionProviderProfileState('draft', 'pending_review'), true);
  assert.equal(canTransitionProviderProfileState('pending_review', 'approved'), true);
  assert.equal(canTransitionProviderProfileState('approved', 'suspended'), true);
  assert.equal(canTransitionProviderProfileState('draft', 'approved'), false);
  assert.equal(canTransitionProviderProfileState('rejected', 'approved'), false);
});

test('stores only hashed session tokens and declares uniqueness, query, and TTL indexes', async () => {
  const { Session } = createModels();
  const session = new Session({
    userId: new mongoose.Types.ObjectId(),
    tokenHash: 'a'.repeat(64),
    expiresAt: new Date(Date.now() + 60_000)
  });
  await session.validate();
  assert.equal(session.toJSON().tokenHash, undefined);
  await assert.rejects(
    new Session({
      userId: new mongoose.Types.ObjectId(),
      tokenHash: 'raw-token',
      expiresAt: new Date(Date.now() + 60_000)
    }).validate(),
    /tokenHash/
  );
  assert.equal(indexByName(Session, 'sessions_token_hash_unique')?.[1].unique, true);
  assert.equal(indexByName(Session, 'sessions_expiry_ttl')?.[1].expireAfterSeconds, 0);
  assert.deepEqual(indexByName(Session, 'sessions_user_created')?.[0], {
    userId: 1,
    createdAt: -1
  });
  assert.equal(Session.schema.path('tokenHash').options.select, false);
  assert.equal(Session.schema.path('passwordHash'), undefined);
});
