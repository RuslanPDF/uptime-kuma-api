/**
 * Uptime Kuma TypeScript Client Library
 * 
 * A fully-featured TypeScript client for the Uptime Kuma monitoring tool API.
 * 
 * @example
 * ```typescript
 * import { UptimeKumaClient } from 'uptime-kuma-ts';
 * 
 * const client = new UptimeKumaClient({
 *   url: 'http://localhost:3001',
 * });
 * 
 * await client.connect();
 * await client.login({ username: 'admin', password: 'admin123' });
 * 
 * const monitors = await client.getMonitors();
 * console.log(monitors);
 * 
 * client.disconnect();
 * ```
 */

export { UptimeKumaClient } from './client';
export * from './types';
export * from './utils';
