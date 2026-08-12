import { Types } from 'mongoose';
import type {
  AuthAccountState,
  SeekerLocale,
  SeekerPreferences,
  SeekerProfilePatch
} from '@sadat-real-estate/contracts';
import type { IdentityModels } from '../identity/models.js';

export interface SeekerAccount {
  id: string;
  phone: string;
  status: AuthAccountState;
  locale: SeekerLocale;
  firstName: string;
  lastName: string;
}

export interface SeekerPreferencesRecord {
  preferences: SeekerPreferences;
  updatedAt: Date;
}

export interface CreateSeekerInput {
  phone: string;
  firstName: string;
  lastName: string;
  locale: SeekerLocale;
}

export interface SeekerRepository {
  create(input: CreateSeekerInput): Promise<SeekerAccount>;
  findByUserId(userId: string): Promise<SeekerAccount | undefined>;
  updateProfile(userId: string, patch: SeekerProfilePatch): Promise<SeekerAccount | undefined>;
  findPreferences(userId: string): Promise<SeekerPreferencesRecord | undefined>;
  updatePreferences(userId: string, preferences: SeekerPreferences): Promise<SeekerPreferencesRecord | undefined>;
}

interface LeanUser {
  _id: Types.ObjectId;
  normalizedPhone?: string;
  roleType: 'seeker' | 'provider' | 'admin';
  status: AuthAccountState;
  locale: SeekerLocale;
}

interface LeanProfile {
  userId: Types.ObjectId;
  firstName?: string;
  lastName?: string;
  preferences?: SeekerPreferences;
  updatedAt: Date;
}

function duplicateKey(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 11000;
}

function toAccount(user: LeanUser, profile: LeanProfile): SeekerAccount | undefined {
  if (user.roleType !== 'seeker' || !user.normalizedPhone || !profile.firstName || !profile.lastName) {
    return undefined;
  }
  return {
    id: user._id.toHexString(),
    phone: user.normalizedPhone,
    status: user.status,
    locale: user.locale,
    firstName: profile.firstName,
    lastName: profile.lastName
  };
}

export function createMongooseSeekerRepository(models: IdentityModels): SeekerRepository {
  const { User, SeekerProfile } = models;

  async function load(userId: string): Promise<{ user: LeanUser; profile: LeanProfile } | undefined> {
    if (!/^[a-f0-9]{24}$/.test(userId)) return undefined;
    const objectId = new Types.ObjectId(userId);
    const [user, profile] = await Promise.all([
      User.findOne({ _id: objectId, roleType: 'seeker' })
        .select('_id normalizedPhone roleType status locale')
        .lean<LeanUser>()
        .exec(),
      SeekerProfile.findOne({ userId: objectId })
        .lean<LeanProfile>()
        .exec()
    ]);
    return user && profile ? { user, profile } : undefined;
  }

  async function findByUserId(userId: string): Promise<SeekerAccount | undefined> {
    const loaded = await load(userId);
    return loaded ? toAccount(loaded.user, loaded.profile) : undefined;
  }

  return {
    async create(input) {
      try {
        const user = await User.create({
          normalizedPhone: input.phone,
          roleType: 'seeker',
          status: 'verified',
          locale: input.locale
        });
        try {
          const profile = await SeekerProfile.create({
            userId: user._id,
            firstName: input.firstName,
            lastName: input.lastName,
            preferences: {}
          });
          return {
            id: user._id.toHexString(),
            phone: input.phone,
            status: user.status,
            locale: user.locale,
            firstName: profile.firstName!,
            lastName: profile.lastName!
          };
        } catch (error) {
          await User.deleteOne({ _id: user._id }).exec();
          throw new Error('SEEKER_PROFILE_CREATE_FAILED', { cause: error });
        }
      } catch (error) {
        if (duplicateKey(error)) throw new Error('SEEKER_ALREADY_EXISTS', { cause: error });
        throw new Error('SEEKER_CREATE_FAILED', { cause: error });
      }
    },

    findByUserId,

    async updateProfile(userId, patch) {
      if (!/^[a-f0-9]{24}$/.test(userId)) return undefined;
      const objectId = new Types.ObjectId(userId);
      const userPatch = patch.locale === undefined ? undefined : { locale: patch.locale };
      if (userPatch) {
        await User.updateOne({ _id: objectId, roleType: 'seeker' }, { $set: userPatch }).exec();
      }
      const profilePatch: Record<string, string> = {};
      if (patch.firstName !== undefined) profilePatch.firstName = patch.firstName;
      if (patch.lastName !== undefined) profilePatch.lastName = patch.lastName;
      if (Object.keys(profilePatch).length > 0) {
        await SeekerProfile.updateOne(
          { userId: objectId },
          { $set: profilePatch }
        ).exec();
      }
      return findByUserId(userId);
    },

    async findPreferences(userId) {
      if (!/^[a-f0-9]{24}$/.test(userId)) return undefined;
      const profile = await SeekerProfile.findOne({ userId: new Types.ObjectId(userId) })
        .select('preferences updatedAt')
        .lean<Pick<LeanProfile, 'preferences' | 'updatedAt'>>()
        .exec();
      return profile ? { preferences: profile.preferences ?? {}, updatedAt: profile.updatedAt } : undefined;
    },

    async updatePreferences(userId, preferences) {
      if (!/^[a-f0-9]{24}$/.test(userId)) return undefined;
      const profile = await SeekerProfile.findOneAndUpdate(
        { userId: new Types.ObjectId(userId) },
        { $set: { preferences } },
        { new: true }
      )
        .select('preferences updatedAt')
        .lean<Pick<LeanProfile, 'preferences' | 'updatedAt'>>()
        .exec();
      return profile ? { preferences: profile.preferences ?? {}, updatedAt: profile.updatedAt } : undefined;
    }
  };
}
