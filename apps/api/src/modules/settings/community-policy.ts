import type { Connection } from 'mongoose';

export interface CommunityRuntimeSettings {
  blockedWordReview: boolean;
  blockedWords: string[];
  blockedWordAction: 'manual_review' | 'reject';
  dailyPostLimit?: number;
  moderationWaitHours?: number;
}

export interface CommunitySettingsReader { read(): Promise<CommunityRuntimeSettings> }

export const DEFAULT_COMMUNITY_RUNTIME_SETTINGS: CommunityRuntimeSettings = Object.freeze({
  blockedWordReview: false,
  blockedWords: [],
  blockedWordAction: 'manual_review'
});

function boundedInteger(value: unknown, minimum: number, maximum: number): number | undefined {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= minimum && value <= maximum ? value : undefined;
}

export function communityRuntimeSettings(values: Record<string, unknown> | undefined): CommunityRuntimeSettings {
  if (!values) return DEFAULT_COMMUNITY_RUNTIME_SETTINGS;
  const blockedWords = Array.isArray(values.blocked_words)
    ? [...new Set(values.blocked_words.flatMap((word) => typeof word === 'string' && word.trim().length >= 2 && word.trim().length <= 80 ? [word.trim().toLocaleLowerCase('ar-EG')] : []))].slice(0, 500)
    : [];
  const dailyPostLimit = boundedInteger(values.daily_post_limit, 1, 100);
  const moderationWaitHours = boundedInteger(values.moderation_wait_hours, 1, 168);
  return {
    blockedWordReview: values.blocked_word_review === true,
    blockedWords,
    blockedWordAction: values.blocked_word_action === 'reject' ? 'reject' : 'manual_review',
    ...(dailyPostLimit !== undefined ? { dailyPostLimit } : {}),
    ...(moderationWaitHours !== undefined ? { moderationWaitHours } : {})
  };
}

export function createMongooseCommunitySettingsReader(connection: Connection): CommunitySettingsReader {
  return {
    async read() {
      const record = await connection.collection('admin_settings').findOne({ namespace: 'display' }, { projection: { values: 1 } });
      return communityRuntimeSettings(record?.values && typeof record.values === 'object' && !Array.isArray(record.values) ? record.values as Record<string, unknown> : undefined);
    }
  };
}
