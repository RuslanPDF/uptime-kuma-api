/**
 * Utility functions for Uptime Kuma API
 */

import { Monitor, Tag, Notification, Proxy, DockerHost, Maintenance, ApiKey } from './types';

/**
 * Find monitor by name
 */
export function findMonitorByName(monitors: Monitor[], name: string): Monitor | undefined {
  return monitors.find((m) => m.name === name);
}

/**
 * Find tag by name
 */
export function findTagByName(tags: Tag[], name: string): Tag | undefined {
  return tags.find((t) => t.name === name);
}

/**
 * Find notification by name
 */
export function findNotificationByName(
  notifications: Notification[],
  name: string
): Notification | undefined {
  return notifications.find((n) => n.name === name);
}

/**
 * Find proxy by host and port
 */
export function findProxyByHostPort(
  proxies: Proxy[],
  host: string,
  port: number
): Proxy | undefined {
  return proxies.find((p) => p.host === host && p.port === port);
}

/**
 * Find docker host by name
 */
export function findDockerHostByName(
  dockerHosts: DockerHost[],
  name: string
): DockerHost | undefined {
  return dockerHosts.find((h) => h.name === name);
}

/**
 * Find maintenance by title
 */
export function findMaintenanceByTitle(
  maintenances: Maintenance[],
  title: string
): Maintenance | undefined {
  return maintenances.find((m) => m.title === title);
}

/**
 * Find API key by name
 */
export function findApiKeyByName(apiKeys: ApiKey[], name: string): ApiKey | undefined {
  return apiKeys.find((k) => k.name === name);
}

/**
 * Check if two objects have different values for given keys
 */
export function objectChanged<T extends Record<string, unknown>>(
  current: T,
  updated: Partial<T>,
  ignoreKeys?: string[]
): boolean {
  for (const key in updated) {
    if (ignoreKeys && ignoreKeys.includes(key)) {
      continue;
    }

    const currentValue = current[key];
    const updatedValue = updated[key];

    if (Array.isArray(updatedValue)) {
      if (!Array.isArray(currentValue)) return true;
      if (currentValue.length !== updatedValue.length) return true;
      for (let i = 0; i < updatedValue.length; i++) {
        if (typeof updatedValue[i] === 'object' && updatedValue[i] !== null) {
          if (objectChanged(currentValue[i] as Record<string, unknown>, updatedValue[i] as Record<string, unknown>)) {
            return true;
          }
        } else if (currentValue[i] !== updatedValue[i]) {
          return true;
        }
      }
    } else if (typeof updatedValue === 'object' && updatedValue !== null) {
      if (typeof currentValue !== 'object' || currentValue === null) return true;
      if (objectChanged(currentValue as Record<string, unknown>, updatedValue as Record<string, unknown>)) {
        return true;
      }
    } else if (currentValue !== updatedValue) {
      return true;
    }
  }

  return false;
}

/**
 * Remove undefined values from object
 */
export function removeUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const result: Partial<T> = {};
  for (const key in obj) {
    if (obj[key] !== undefined) {
      result[key] = obj[key];
    }
  }
  return result;
}

/**
 * Validate monitor configuration
 */
export function validateMonitor(monitor: Monitor): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!monitor.name) {
    errors.push('Monitor name is required');
  }

  if (!monitor.type) {
    errors.push('Monitor type is required');
  }

  // Type-specific validations
  switch (monitor.type) {
    case 'http':
    case 'keyword':
      if (!monitor.url) {
        errors.push(`URL is required for ${monitor.type} monitor`);
      }
      break;
    case 'port':
      if (!monitor.hostname) {
        errors.push('Hostname is required for port monitor');
      }
      if (!monitor.port) {
        errors.push('Port is required for port monitor');
      }
      break;
    case 'ping':
      if (!monitor.hostname) {
        errors.push('Hostname is required for ping monitor');
      }
      break;
    case 'dns':
      if (!monitor.hostname) {
        errors.push('Hostname is required for DNS monitor');
      }
      break;
    case 'docker':
      if (!monitor.docker_container) {
        errors.push('Docker container is required for docker monitor');
      }
      if (!monitor.docker_host) {
        errors.push('Docker host is required for docker monitor');
      }
      break;
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get default database connection string for monitor type
 */
export function getDefaultDatabaseConnectionString(type: string): string {
  switch (type) {
    case 'sqlserver':
      return 'Server=<hostname>,<port>;Database=<your database>;User Id=<your user id>;Password=<your password>;Encrypt=<true/false>;TrustServerCertificate=<Yes/No>;Connection Timeout=<int>';
    case 'postgres':
      return 'postgres://username:password@host:port/database';
    case 'mysql':
      return 'mysql://username:password@host:port/database';
    case 'mongodb':
      return 'mongodb://username:password@host:port/database';
    case 'redis':
      return 'redis://user:password@host:port';
    default:
      return '';
  }
}

/**
 * Get default port for monitor type
 */
export function getDefaultPort(type: string): number | undefined {
  switch (type) {
    case 'dns':
      return 53;
    case 'radius':
      return 1812;
    default:
      return undefined;
  }
}
