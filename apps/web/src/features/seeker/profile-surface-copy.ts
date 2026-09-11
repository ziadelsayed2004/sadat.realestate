import type { SupportedLocale } from '@sadat-real-estate/contracts';
import { localizeCopy } from '../localization/copy-catalog.ts';

export function getPersonalSurfaceCopy(locale: SupportedLocale) {
  return localizeCopy('seeker/profile-surface-copy#getPersonalSurfaceCopy', locale, {
    role: '',
    email: ''
  });
}

export function getSettingsSurfaceCopy(locale: SupportedLocale) {
  return localizeCopy('seeker/profile-surface-copy#getSettingsSurfaceCopy', locale, {
    emailHeading: '', currentEmail: '', updateEmail: '', passwordHeading: '', currentPassword: '',
    newPassword: '', confirmPassword: '', changePassword: '', notificationsHeading: '', requestUpdates: '',
    requestUpdatesBody: '', viewingReminders: '', viewingRemindersBody: '', savedPropertyAlerts: '',
    savedPropertyAlertsBody: '', accountAlerts: '', accountAlertsBody: '', marketingMessages: '',
    marketingMessagesBody: '', otherDevicesHeading: '', otherDevicesBody: '', signOutOtherDevices: '',
    dangerHeading: '', dangerBody: ''
  });
}

export function getProfileFeedbackCopy(locale: SupportedLocale) {
  return localizeCopy('seeker/profile-surface-copy#getProfileFeedbackCopy', locale, {
    invalidPassword: '',
    passwordFailure: ''
  });
}
