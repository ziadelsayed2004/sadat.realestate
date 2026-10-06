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
  it('preserves login destinations and rejects external return URLs', () => {
    expect(authCompletionHref('/auth/login?returnTo=/properties%3Flang%3Dar', 'seeker', 'ar')).toBe('/properties?lang=ar');
    expect(authCompletionHref('/auth/login?returnTo=//external.example', 'admin', 'en')).toBe('/admin?lang=en');
    expect(authCompletionHref('/auth/verify-email?purpose=login', 'provider', 'ar')).toBe('/provider?lang=ar');
  });
});
