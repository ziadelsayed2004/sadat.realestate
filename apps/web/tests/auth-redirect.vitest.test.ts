import { describe, it, expect } from 'vitest';
import { authCompletionHref } from '../src/features/auth/redirect.ts';

describe('authentication completion destination', () => {
  it.each(['ar', 'en'] as const)('opens the public homepage for every new account in %s', locale => {
    for (const role of ['seeker', 'provider', 'admin']) {
      expect(authCompletionHref('/auth/register?returnTo=/admin', role, locale)).toBe(`/?lang=${locale}`);
      expect(authCompletionHref('/auth/verify-email?purpose=registration', role, locale)).toBe(`/?lang=${locale}`);
    }
    for (const providerType of ['individual_broker', 'brokerage_office', 'developer_company']) {
      expect(authCompletionHref(`/auth/register/provider/account?providerType=${providerType}`, 'provider', locale)).toBe(`/?lang=${locale}`);
    }
  });
  it.each(['ar', 'en'] as const)('opens the homepage on login even with a previous destination in %s', locale => {
    for (const role of ['seeker', 'provider', 'admin', undefined]) {
      for (const url of [undefined, '/auth/login', '/auth/verify-email?purpose=login', '/auth/login?returnTo=/seeker/viewings%3Flang%3Dar', '/auth/login?returnTo=/properties%3Flang%3Dar', '/auth/login?returnTo=//external.example', '/auth/login?returnTo=https%3A%2F%2Fexternal.example']) {
        expect(authCompletionHref(url, role, locale)).toBe(`/?lang=${locale}`);
      }
    }
  });
});
