import assert from 'node:assert/strict';
import test from 'node:test';
import { communityRuntimeSettings } from '../../src/modules/settings/community-policy.js';

test('maps bounded community moderation settings from the display namespace', () => {
  assert.deepEqual(communityRuntimeSettings({ blocked_word_review: true, blocked_words: [' Spam ', 'spam', 'إساءة'], blocked_word_action: 'reject', daily_post_limit: 3, moderation_wait_hours: 24 }), {
    blockedWordReview: true,
    blockedWords: ['spam', 'إساءة'],
    blockedWordAction: 'reject',
    dailyPostLimit: 3,
    moderationWaitHours: 24
  });
});

test('uses safe community defaults and ignores unsafe bounds', () => {
  assert.deepEqual(communityRuntimeSettings({ daily_post_limit: 0, moderation_wait_hours: 999, blocked_words: ['x'] }), { blockedWordReview: false, blockedWords: [], blockedWordAction: 'manual_review' });
});
