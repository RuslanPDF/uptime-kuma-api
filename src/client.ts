import { io, Socket } from 'socket.io-client';
import {
  UptimeKumaConfig,
  LoginCredentials,
  LoginResponse,
  Monitor,
  Tag,
  Notification,
  Proxy,
  StatusPage,
  DockerHost,
  Maintenance,
  ApiKey,
  Settings,
  HeartbeatList,
  EventCallback,
} from './types';

export class UptimeKumaClient {
  private socket: Socket | null = null;
  private config: Required<UptimeKumaConfig>;
  private connected = false;
  private _token: string | null = null;
  private _eventData: Record<string, unknown> = {};
  private _eventResolvers: Map<string, (value: unknown) => void> = new Map();

  constructor(config: UptimeKumaConfig) {
    this.config = {
      url: config.url,
      timeout: config.timeout ?? 10000,
      headers: config.headers ?? {},
      sslVerify: config.sslVerify ?? true,
      waitEvents: config.waitEvents ?? 0.2,
    };
  }

  /**
   * Connect to Uptime Kuma server
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket = io(this.config.url, {
        timeout: this.config.timeout,
        rejectUnauthorized: this.config.sslVerify,
        extraHeaders: this.config.headers,
      });

      this.socket.on('connect', () => {
        this.connected = true;
        this._setupEventListeners();
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        reject(new Error(`Connection failed: ${error.message}`));
      });

      this.socket.on('disconnect', () => {
        this.connected = false;
      });
    });
  }

  /**
   * Disconnect from Uptime Kuma server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
      this._token = null;
      this._eventData = {};
    }
  }

  /**
   * Check if connected to server
   */
  isConnected(): boolean {
    return this.connected && this.socket !== null;
  }

  /**
   * Get current auth token (if logged in by token or after login())
   */
  getToken(): string | null {
    return this._token;
  }

  private _setupEventListeners(): void {
    if (!this.socket) return;

    const events = ['monitorList', 'notificationList', 'proxyList', 'statusPageList', 'dockerHostList', 'maintenanceList', 'apiKeyList'];
    events.forEach((ev) => {
      this.socket!.on(ev, (data: unknown) => {
        this._eventData[ev] = data;
        const resolver = this._eventResolvers.get(ev);
        if (resolver) {
          resolver(data);
          this._eventResolvers.delete(ev);
        }
      });
    });
  }

  private _waitForEvent<T>(event: string): Promise<T> {
    const cached = this._eventData[event];
    if (cached !== undefined && cached !== null) {
      return Promise.resolve(cached as T);
    }
    return new Promise<T>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this._eventResolvers.delete(event);
        reject(new Error(`Timeout waiting for event: ${event}`));
      }, this.config.timeout);
      this._eventResolvers.set(event, (data) => {
        clearTimeout(timeout);
        resolve(data as T);
      });
    });
  }

  /**
   * Call API method
   */
  private async call<T>(event: string, data?: unknown): Promise<T> {
    if (!this.socket || !this.connected) {
      throw new Error('Not connected to Uptime Kuma server');
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Request timeout: ${event}`));
      }, this.config.timeout);

      this.socket!.emit(event, data, (response: unknown) => {
        clearTimeout(timeout);
        try {
          const raw = Array.isArray(response) ? response[0] : response;
          const r = raw as { ok?: boolean; msg?: string; data?: T; token?: string; monitorID?: number; monitor?: T } | undefined;
          if (!r || (typeof r === 'object' && r.ok === false)) {
            reject(new Error((r?.msg as string) || 'Unknown error'));
            return;
          }
          let result = (r.data !== undefined ? r.data : r) as T;
          if (event === 'getMonitor' && result && typeof result === 'object' && 'monitor' in result) {
            result = (result as { monitor: T }).monitor;
          }
          resolve(result);
        } catch (err) {
          reject(err instanceof Error ? err : new Error(String(err)));
        }
      });
    });
  }

  /**
   * Wait for events to be processed
   */
  private async waitForEvents(): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, this.config.waitEvents * 1000);
    });
  }

  // ==================== Authentication ====================

  /**
   * Login with username and password
   */
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const response = await this.call<{ token?: string; tokenRequired?: boolean }>('login', credentials);
    const token = response?.token ?? '';
    this._token = token || null;
    return { token, tokenRequired: response?.tokenRequired ?? true };
  }

  /**
   * Login with token
   */
  async loginByToken(token: string): Promise<void> {
    await this.call('loginByToken', { token });
    this._token = token;
  }

  /**
   * Auto login (for disabled auth)
   */
  async autoLogin(): Promise<void> {
    await this.call('login', {});
  }

  /**
   * Logout
   */
  async logout(): Promise<void> {
    await this.call('logout');
    this._token = null;
  }

  /**
   * Setup initial username and password
   */
  async setup(username: string, password: string): Promise<void> {
    await this.call('setup', { username, password });
  }

  // ==================== Monitors ====================

  /**
   * Get all monitors
   */
  async getMonitors(): Promise<Monitor[]> {
    const data = await this._waitForEvent<Record<string, Monitor>>('monitorList');
    return Object.values(data || {});
  }

  /**
   * Get monitor by ID
   */
  async getMonitor(id: number): Promise<Monitor> {
    return await this.call<Monitor>('getMonitor', id);
  }

  private _prepareMonitorData(monitor: Monitor): Record<string, unknown> {
    const data = { ...monitor } as Record<string, unknown>;
    if (!data.accepted_statuscodes && (data.type === 'http' || data.type === 'keyword')) {
      data.accepted_statuscodes = ['200-299'];
    }
    if (Array.isArray(data.notificationIDList)) {
      const dict: Record<number, boolean> = {};
      data.notificationIDList.forEach((id: number) => { dict[id] = true; });
      data.notificationIDList = dict;
    } else if (!data.notificationIDList) {
      data.notificationIDList = {};
    }
    data.interval = data.interval ?? 60;
    data.retryInterval = data.retryInterval ?? 60;
    data.maxretries = data.maxretries ?? 0;
    return data;
  }

  /**
   * Add new monitor
   */
  async addMonitor(monitor: Monitor): Promise<Monitor> {
    const data = this._prepareMonitorData(monitor);
    const result = await this.call<{ monitorID: number }>('add', data);
    await this.waitForEvents();
    return await this.getMonitor(result.monitorID);
  }

  /**
   * Edit existing monitor
   */
  async editMonitor(id: number, monitor: Partial<Monitor>): Promise<Monitor> {
    const existing = await this.getMonitor(id);
    const merged = { ...existing, ...monitor, id };
    const data = this._prepareMonitorData(merged);
    await this.call('editMonitor', data);
    await this.waitForEvents();
    return await this.getMonitor(id);
  }

  /**
   * Delete monitor
   */
  async deleteMonitor(id: number): Promise<void> {
    await this.call('deleteMonitor', id);
    await this.waitForEvents();
  }

  /**
   * Pause monitor
   */
  async pauseMonitor(id: number): Promise<void> {
    await this.call('pauseMonitor', id);
    await this.waitForEvents();
  }

  /**
   * Resume monitor
   */
  async resumeMonitor(id: number): Promise<void> {
    await this.call('resumeMonitor', id);
    await this.waitForEvents();
  }

  /**
   * Get monitor heartbeats
   */
  async getMonitorHeartbeats(id: number, hours = 24): Promise<HeartbeatList> {
    const r = await this.call<{ data?: HeartbeatList }>('getMonitorBeats', [id, hours]);
    return (r?.data ?? r) as HeartbeatList;
  }

  // ==================== Tags ====================

  /**
   * Get all tags
   */
  async getTags(): Promise<Tag[]> {
    const r = await this.call<{ tags?: Tag[] }>('getTags');
    return r?.tags ?? [];
  }

  /**
   * Get tag by ID
   */
  async getTag(id: number): Promise<Tag> {
    const tags = await this.getTags();
    const tag = tags.find((t) => t.id === id);
    if (!tag) {
      throw new Error(`Tag with id ${id} not found`);
    }
    return tag;
  }

  /**
   * Add new tag
   */
  async addTag(tag: Tag): Promise<Tag> {
    const data = { new: true, name: tag.name, color: tag.color };
    const result = await this.call<{ tag: Tag }>('addTag', data);
    await this.waitForEvents();
    return result?.tag ?? (result as unknown as Tag);
  }

  /**
   * Edit existing tag
   */
  async editTag(id: number, tag: Partial<Tag>): Promise<Tag> {
    let existing: Tag;
    try {
      existing = await this.getTag(id);
    } catch {
      existing = { id, name: '', color: '#000000' };
    }
    const merged = { ...existing, ...tag, id };
    await this.call('editTag', merged);
    await this.waitForEvents();
    return merged as Tag;
  }

  /**
   * Delete tag
   */
  async deleteTag(id: number): Promise<void> {
    await this.call('deleteTag', id);
    await this.waitForEvents();
  }

  // ==================== Monitor Tags ====================

  /**
   * Add tag to monitor
   */
  async addMonitorTag(monitorId: number, tagId: number, value?: string): Promise<void> {
    await this.call('addMonitorTag', [tagId, monitorId, value || '']);
    await this.waitForEvents();
  }

  /**
   * Remove tag from monitor
   */
  async deleteMonitorTag(monitorId: number, tagId: number, value?: string): Promise<void> {
    await this.call('deleteMonitorTag', [tagId, monitorId, value || '']);
    await this.waitForEvents();
  }

  // ==================== Notifications ====================

  /**
   * Get all notifications
   */
  async getNotifications(): Promise<Notification[]> {
    const data = await this._waitForEvent<Record<string, Notification> | Notification[]>('notificationList');
    return Array.isArray(data) ? data : Object.values(data || {});
  }

  /**
   * Get notification by ID
   */
  async getNotification(id: number): Promise<Notification> {
    const notifications = await this.getNotifications();
    const notification = notifications.find((n) => n.id === id);
    if (!notification) {
      throw new Error(`Notification with id ${id} not found`);
    }
    return notification;
  }

  /**
   * Add new notification
   */
  async addNotification(notification: Notification): Promise<Notification> {
    const result = await this.call<{ id: number }>('addNotification', [notification, null]);
    await this.waitForEvents();
    return await this.getNotification(result.id);
  }

  /**
   * Edit existing notification
   */
  async editNotification(id: number, notification: Partial<Notification>): Promise<Notification> {
    const existing = await this.getNotification(id);
    const merged = { ...existing, ...notification, id };
    await this.call('editNotification', [merged, id]);
    await this.waitForEvents();
    return await this.getNotification(id);
  }

  /**
   * Delete notification
   */
  async deleteNotification(id: number): Promise<void> {
    await this.call('deleteNotification', id);
    await this.waitForEvents();
  }

  /**
   * Test notification
   */
  async testNotification(notification: Notification): Promise<void> {
    await this.call('testNotification', notification);
  }

  // ==================== Proxies ====================

  /**
   * Get all proxies
   */
  async getProxies(): Promise<Proxy[]> {
    const data = await this._waitForEvent<Record<string, Proxy> | Proxy[]>('proxyList');
    return Array.isArray(data) ? data : Object.values(data || {});
  }

  /**
   * Get proxy by ID
   */
  async getProxy(id: number): Promise<Proxy> {
    const proxies = await this.getProxies();
    const proxy = proxies.find((p) => p.id === id);
    if (!proxy) {
      throw new Error(`Proxy with id ${id} not found`);
    }
    return proxy;
  }

  /**
   * Add new proxy
   */
  async addProxy(proxy: Proxy): Promise<Proxy> {
    const result = await this.call<{ id: number }>('addProxy', proxy);
    await this.waitForEvents();
    return await this.getProxy(result.id);
  }

  /**
   * Edit existing proxy
   */
  async editProxy(id: number, proxy: Partial<Proxy>): Promise<Proxy> {
    await this.call('editProxy', { ...proxy, id });
    await this.waitForEvents();
    return await this.getProxy(id);
  }

  /**
   * Delete proxy
   */
  async deleteProxy(id: number): Promise<void> {
    await this.call('deleteProxy', id);
    await this.waitForEvents();
  }

  // ==================== Status Pages ====================

  /**
   * Get all status pages
   */
  async getStatusPages(): Promise<StatusPage[]> {
    const data = await this._waitForEvent<Record<string, StatusPage> | StatusPage[]>('statusPageList');
    return Array.isArray(data) ? data : Object.values(data || {});
  }

  /**
   * Get status page by slug
   */
  async getStatusPage(slug: string): Promise<StatusPage> {
    return await this.call<StatusPage>('getStatusPage', slug);
  }

  /**
   * Add new status page
   */
  async addStatusPage(statusPage: StatusPage): Promise<StatusPage> {
    await this.call('addStatusPage', [statusPage.title, statusPage.slug]);
    await this.waitForEvents();
    return await this.getStatusPage(statusPage.slug);
  }

  /**
   * Save status page
   */
  async saveStatusPage(slug: string, statusPage: Partial<StatusPage>): Promise<StatusPage> {
    await this.call('saveStatusPage', { ...statusPage, slug });
    await this.waitForEvents();
    return await this.getStatusPage(slug);
  }

  /**
   * Delete status page
   */
  async deleteStatusPage(slug: string): Promise<void> {
    await this.call('deleteStatusPage', slug);
    await this.waitForEvents();
  }

  // ==================== Docker Hosts ====================

  /**
   * Get all docker hosts
   */
  async getDockerHosts(): Promise<DockerHost[]> {
    const data = await this._waitForEvent<Record<string, DockerHost> | DockerHost[]>('dockerHostList');
    return Array.isArray(data) ? data : Object.values(data || {});
  }

  /**
   * Get docker host by ID
   */
  async getDockerHost(id: number): Promise<DockerHost> {
    const hosts = await this.getDockerHosts();
    const host = hosts.find((h) => h.id === id);
    if (!host) {
      throw new Error(`Docker host with id ${id} not found`);
    }
    return host;
  }

  /**
   * Add new docker host
   */
  async addDockerHost(dockerHost: DockerHost): Promise<DockerHost> {
    const result = await this.call<{ id: number }>('addDockerHost', dockerHost);
    await this.waitForEvents();
    return await this.getDockerHost(result.id);
  }

  /**
   * Edit existing docker host
   */
  async editDockerHost(id: number, dockerHost: Partial<DockerHost>): Promise<DockerHost> {
    await this.call('editDockerHost', { ...dockerHost, id });
    await this.waitForEvents();
    return await this.getDockerHost(id);
  }

  /**
   * Delete docker host
   */
  async deleteDockerHost(id: number): Promise<void> {
    await this.call('deleteDockerHost', id);
    await this.waitForEvents();
  }

  /**
   * Test docker host
   */
  async testDockerHost(dockerHost: DockerHost): Promise<void> {
    await this.call('testDockerHost', dockerHost);
  }

  // ==================== Maintenances ====================

  /**
   * Get all maintenances
   */
  async getMaintenances(): Promise<Maintenance[]> {
    const data = await this._waitForEvent<Record<string, Maintenance> | Maintenance[]>('maintenanceList');
    return Array.isArray(data) ? data : Object.values(data || {});
  }

  /**
   * Get maintenance by ID
   */
  async getMaintenance(id: number): Promise<Maintenance> {
    return await this.call<Maintenance>('getMaintenance', id);
  }

  private _prepareMaintenanceData(maintenance: Maintenance): Record<string, unknown> {
    const today = new Date().toISOString().slice(0, 10);
    return {
      ...maintenance,
      title: maintenance.title,
      strategy: maintenance.strategy,
      active: maintenance.active ?? true,
      description: maintenance.description ?? '',
      intervalDay: maintenance.intervalDay ?? 1,
      dateRange: maintenance.dateRange ?? [`${today} 00:00:00`],
      timeRange: maintenance.timeRange ?? [
        { hours: 2, minutes: 0 },
        { hours: 3, minutes: 0 },
      ],
      weekdays: maintenance.weekdays ?? [],
      daysOfMonth: maintenance.daysOfMonth ?? [],
      cron: '30 3 * * *',
      durationMinutes: 60,
    };
  }

  /**
   * Add new maintenance
   */
  async addMaintenance(maintenance: Maintenance): Promise<Maintenance> {
    const data = this._prepareMaintenanceData(maintenance);
    const result = await this.call<{ maintenanceID: number }>('addMaintenance', data);
    await this.waitForEvents();
    return await this.getMaintenance(result.maintenanceID);
  }

  /**
   * Edit existing maintenance
   */
  async editMaintenance(id: number, maintenance: Partial<Maintenance>): Promise<Maintenance> {
    await this.call('editMaintenance', { ...maintenance, id });
    await this.waitForEvents();
    return await this.getMaintenance(id);
  }

  /**
   * Delete maintenance
   */
  async deleteMaintenance(id: number): Promise<void> {
    await this.call('deleteMaintenance', id);
    await this.waitForEvents();
  }

  /**
   * Pause maintenance
   */
  async pauseMaintenance(id: number): Promise<void> {
    await this.call('pauseMaintenance', id);
    await this.waitForEvents();
  }

  /**
   * Resume maintenance
   */
  async resumeMaintenance(id: number): Promise<void> {
    await this.call('resumeMaintenance', id);
    await this.waitForEvents();
  }

  // ==================== API Keys ====================

  /**
   * Get all API keys
   */
  async getApiKeys(): Promise<ApiKey[]> {
    const data = await this._waitForEvent<Record<string, ApiKey> | ApiKey[]>('apiKeyList');
    return Array.isArray(data) ? data : Object.values(data || {});
  }

  /**
   * Get API key by ID
   */
  async getApiKey(id: number): Promise<ApiKey> {
    const keys = await this.getApiKeys();
    const key = keys.find((k) => k.id === id);
    if (!key) {
      throw new Error(`API key with id ${id} not found`);
    }
    return key;
  }

  /**
   * Add new API key
   */
  async addApiKey(apiKey: ApiKey): Promise<{ key: string; keyID: number }> {
    const result = await this.call<{ key?: string; keyID?: number }>('addAPIKey', apiKey);
    await this.waitForEvents();
    return { key: result?.key ?? '', keyID: result?.keyID ?? 0 };
  }

  /**
   * Delete API key
   */
  async deleteApiKey(id: number): Promise<void> {
    await this.call('deleteAPIKey', id);
    await this.waitForEvents();
  }

  /**
   * Enable API key
   */
  async enableApiKey(id: number): Promise<void> {
    await this.call('enableAPIKey', id);
    await this.waitForEvents();
  }

  /**
   * Disable API key
   */
  async disableApiKey(id: number): Promise<void> {
    await this.call('disableAPIKey', id);
    await this.waitForEvents();
  }

  // ==================== Settings ====================

  /**
   * Get settings
   */
  async getSettings(): Promise<Settings> {
    return await this.call<Settings>('getSettings');
  }

  /**
   * Set settings
   */
  async setSettings(settings: Partial<Settings>): Promise<void> {
    await this.call('setSettings', settings);
    await this.waitForEvents();
  }

  // ==================== Info ====================

  /**
   * Get game list
   */
  async getGameList(): Promise<Record<string, string>> {
    return await this.call<Record<string, string>>('getGameList');
  }

  /**
   * Get server info
   */
  async getInfo(): Promise<{ version: string; latestVersion: string }> {
    return await this.call<{ version: string; latestVersion: string }>('info');
  }

  // ==================== Events ====================

  /**
   * Subscribe to event
   */
  on(event: string, callback: EventCallback): void {
    if (!this.socket) {
      throw new Error('Not connected to Uptime Kuma server');
    }
    this.socket.on(event, callback);
  }

  /**
   * Unsubscribe from event
   */
  off(event: string, callback?: EventCallback): void {
    if (!this.socket) {
      throw new Error('Not connected to Uptime Kuma server');
    }
    if (callback) {
      this.socket.off(event, callback);
    } else {
      this.socket.off(event);
    }
  }

  /**
   * Subscribe to event once
   */
  once(event: string, callback: EventCallback): void {
    if (!this.socket) {
      throw new Error('Not connected to Uptime Kuma server');
    }
    this.socket.once(event, callback);
  }
}
