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

export function getPreferenceOptionsCopy(locale: SupportedLocale) {
  return localizeCopy('seeker/profile-surface-copy#getPreferenceOptionsCopy', locale, {
    propertyTypes: {
      apartment: '', villa: '', duplex: '', roof: '', land: '', office: '', commercial: '', factory: ''
    },
    locations: {
      'district-1': '', 'district-2': '', 'district-3': '', 'district-4': '', 'district-5': '',
      'district-6': '', 'district-7': '', 'industrial-zone': '', 'upscale-zone': '', 'new-cairo': ''
    },
    minimum: '',
    maximum: ''
  });
}
