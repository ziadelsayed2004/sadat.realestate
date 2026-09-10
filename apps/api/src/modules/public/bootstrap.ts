import {
  publicBootstrapDataSchema,
  type PublicBootstrapData
} from '@sadat-real-estate/contracts';
import type { DisplaySettingsReader } from '../settings/display-policy.js';

export function createPublicBootstrapService(displaySettings: DisplaySettingsReader) {
  return {
    async read(): Promise<PublicBootstrapData> {
      const display = await displaySettings.read();
      return publicBootstrapDataSchema.parse({
        defaultLocale: 'ar',
        supportedLocales: ['ar', 'en'],
        directions: { ar: 'rtl', en: 'ltr' },
        display
      });
    }
  };
}

export type PublicBootstrapService = ReturnType<typeof createPublicBootstrapService>;
