import { providerVisibility, type ProviderVisibilityReader } from '../../src/modules/provider/visibility.js';
/** Ownership workflow fixtures use approved developers that accepted the active policy. */
export const acknowledgedDeveloperVisibility: ProviderVisibilityReader = { read: async accountId => providerVisibility({ accountId, providerType: 'developer_company', approved: true, acknowledged: true, subscribed: false }) };
