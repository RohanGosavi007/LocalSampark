/**
 * @localsampark/mock-data — Barrel Export
 * Re-exports adapters and provides direct access to raw seed data.
 */

export { MockAdminAPI } from './adapters/admin-adapter';
export { MockMobileAPI, mockQueryKeys } from './adapters/mobile-adapter';
export type { NetworkProfile } from './adapters/mobile-adapter';

// Direct seed access for custom integrations
export { default as usersData } from './seeds/users.json';
export { default as territoriesData } from './seeds/territories.json';
export { default as walletsData } from './seeds/wallets.json';
