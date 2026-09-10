import type { SupportedLocale } from '@sadat-real-estate/contracts';
import { localizeCopy } from '../localization/copy-catalog.ts';

export interface AccountSessionCopy {
  heading: string;
  body: string;
  loading: string;
  empty: string;
  error: string;
  retry: string;
  current: string;
  other: string;
  revoke: string;
  revokeOthers: string;
  revoked: string;
  started: string;
  lastUsed: string;
  expires: string;
  password: string;
  otp: string;
  mfa: string;
}

const empty: AccountSessionCopy = {
  heading: '', body: '', loading: '', empty: '', error: '', retry: '', current: '', other: '',
  revoke: '', revokeOthers: '', revoked: '', started: '', lastUsed: '', expires: '', password: '', otp: '', mfa: ''
};

export function getAccountSessionCopy(locale: SupportedLocale): AccountSessionCopy {
  return localizeCopy('seeker/session-copy#getAccountSessionCopy', locale, empty);
}
