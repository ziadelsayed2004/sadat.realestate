import assert from 'node:assert/strict';
import test from 'node:test';
import {
  seekerPreferencesPatchSchema,
  seekerPreferencesSchema,
  seekerProfilePatchSchema,
  seekerRegistrationRequestSchema
} from '@sadat-real-estate/contracts';

test('accepts strict seeker registration and normalizes names', () => {
  const value = seekerRegistrationRequestSchema.parse({
    verificationToken: 'V'.repeat(43),
    firstName: '  Salma ',
    lastName: 'Hassan',
    password: 'Abc1!xyz',
    locale: 'ar'
  });
  assert.equal(value.firstName, 'Salma');
  assert.throws(() => seekerRegistrationRequestSchema.parse({
    verificationToken: 'V'.repeat(43), firstName: 'Salma', lastName: 'Hassan', password: 'Abc1!xyz', unknown: true
  }));
});

test('rejects malformed seeker identifiers, empty patches, and inverted ranges', () => {
  assert.throws(() => seekerRegistrationRequestSchema.parse({
    verificationToken: 'bad', firstName: 'Salma', lastName: 'Hassan', password: 'Abc1!xyz'
  }));
  assert.throws(() => seekerProfilePatchSchema.parse({}));
  assert.throws(() => seekerPreferencesPatchSchema.parse({}));
  assert.throws(() => seekerPreferencesPatchSchema.parse({ locations: ['new-cairo'], userId: 'other-user' }));
  assert.throws(() => seekerPreferencesSchema.parse({ minPrice: 10, maxPrice: 1 }));
  assert.throws(() => seekerPreferencesSchema.parse({ bedroomsMin: 3, bedroomsMax: 1 }));
});
