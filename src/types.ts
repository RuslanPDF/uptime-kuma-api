/**
 * Uptime Kuma API Types
 */

export enum MonitorType {
  GROUP = 'group',
  HTTP = 'http',
  PORT = 'port',
  PING = 'ping',
  KEYWORD = 'keyword',
  JSON_QUERY = 'json-query',
  GRPC_KEYWORD = 'grpc-keyword',
  DNS = 'dns',
  DOCKER = 'docker',
  REAL_BROWSER = 'real-browser',
  PUSH = 'push',
  STEAM = 'steam',
  GAMEDIG = 'gamedig',
  MQTT = 'mqtt',
  KAFKA_PRODUCER = 'kafka-producer',
  SQLSERVER = 'sqlserver',
  POSTGRES = 'postgres',
  MYSQL = 'mysql',
  MONGODB = 'mongodb',
  RADIUS = 'radius',
  REDIS = 'redis',
  TAILSCALE_PING = 'tailscale-ping',
}

export enum AuthMethod {
  NONE = '',
  BASIC = 'basic',
  NTLM = 'ntlm',
  MTLS = 'mtls',
  OAUTH2_CC = 'oauth2-cc',
}

export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  PATCH = 'PATCH',
  DELETE = 'DELETE',
  HEAD = 'HEAD',
  OPTIONS = 'OPTIONS',
}

export interface UptimeKumaConfig {
  url: string;
  timeout?: number;
  headers?: Record<string, string>;
  sslVerify?: boolean;
  waitEvents?: number;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  tokenRequired: boolean;
}

export interface Monitor {
  id?: number;
  name: string;
  type: MonitorType;
  interval?: number;
  retryInterval?: number;
  resendInterval?: number;
  maxretries?: number;
  upsideDown?: boolean;
  notificationIDList?: number[];
  description?: string;
  active?: boolean;
  
  // HTTP, KEYWORD specific
  url?: string;
  expiryNotification?: boolean;
  ignoreTls?: boolean;
  maxredirects?: number;
  accepted_statuscodes?: string[];
  proxyId?: number;
  method?: HttpMethod | string;
  body?: string;
  headers?: string;
  authMethod?: AuthMethod;
  tlsCert?: string;
  tlsKey?: string;
  tlsCa?: string;
  basic_auth_user?: string;
  basic_auth_pass?: string;
  authDomain?: string;
  authWorkstation?: string;
  oauth_auth_method?: string;
  oauth_token_url?: string;
  oauth_client_id?: string;
  oauth_client_secret?: string;
  oauth_scopes?: string;
  timeout?: number;
  httpBodyEncoding?: string;
  
  // KEYWORD specific
  keyword?: string;
  invertKeyword?: boolean;
  
  // GRPC specific
  grpcUrl?: string;
  grpcEnableTls?: boolean;
  grpcServiceName?: string;
  grpcMethod?: string;
  grpcProtobuf?: string;
  grpcBody?: string;
  grpcMetadata?: string;
  
  // PORT, PING, DNS, STEAM, MQTT
  hostname?: string;
  
  // PING specific
  packetSize?: number;
  
  // PORT, DNS, STEAM, MQTT, RADIUS
  port?: number;
  
  // DNS specific
  dns_resolve_server?: string;
  dns_resolve_type?: string;
  
  // MQTT specific
  mqttUsername?: string;
  mqttPassword?: string;
  mqttTopic?: string;
  mqttSuccessMessage?: string;
  
  // Database monitors
  databaseConnectionString?: string;
  databaseQuery?: string;
  
  // Docker specific
  docker_container?: string;
  docker_host?: number;
  
  // Radius specific
  radiusUsername?: string;
  radiusPassword?: string;
  radiusSecret?: string;
  radiusCalledStationId?: string;
  radiusCallingStationId?: string;
  
  // GameDig specific
  game?: string;
  gamedigGivenPortOnly?: boolean;
  
  // JSON Query specific
  jsonPath?: string;
  expectedValue?: string;
  
  // Kafka specific
  kafkaProducerBrokers?: string;
  kafkaProducerTopic?: string;
  kafkaProducerMessage?: string;
  kafkaProducerSsl?: boolean;
  kafkaProducerAllowAutoTopicCreation?: boolean;
  kafkaProducerSaslOptions?: Record<string, unknown>;
  
  // Parent monitor
  parent?: number;
  
  // Tags
  tags?: MonitorTag[];
}

export interface MonitorTag {
  id?: number;
  monitor_id?: number;
  tag_id?: number;
  name?: string;
  color?: string;
  value?: string;
}

export interface Tag {
  id?: number;
  name: string;
  color: string;
}

export interface Notification {
  id?: number;
  name: string;
  isDefault?: boolean;
  applyExisting?: boolean;
  type?: string;
  userId?: number;
  
  // Notification specific fields (varies by type)
  [key: string]: unknown;
}

export interface Proxy {
  id?: number;
  protocol: 'http' | 'https' | 'socks' | 'socks5' | 'socks4';
  host: string;
  port: number;
  auth?: boolean;
  username?: string;
  password?: string;
  active?: boolean;
  default?: boolean;
  applyExisting?: boolean;
}

export interface StatusPage {
  id?: number;
  slug: string;
  title: string;
  description?: string;
  theme?: string;
  published?: boolean;
  showTags?: boolean;
  domainNameList?: string[];
  googleAnalyticsId?: string;
  customCSS?: string;
  footerText?: string;
  showPoweredBy?: boolean;
  icon?: string;
  publicGroupList?: StatusPageGroup[];
}

export interface StatusPageGroup {
  id?: number;
  name: string;
  weight?: number;
  monitorList?: number[];
}

export interface DockerHost {
  id?: number;
  name: string;
  dockerType: 'socket' | 'tcp';
  dockerDaemon?: string;
}

export interface Maintenance {
  id?: number;
  title: string;
  description?: string;
  strategy: 'manual' | 'single' | 'recurring-interval' | 'recurring-weekday' | 'recurring-day-of-month';
  active?: boolean;
  intervalDay?: number;
  dateRange?: string[];
  dateRangeTimezone?: string;
  timeRange?: string[];
  weekdays?: number[];
  daysOfMonth?: number[];
  monitorIDList?: number[];
  statusPageIDList?: number[];
}

export interface ApiKey {
  id?: number;
  name: string;
  key?: string;
  expires?: string;
  active?: boolean;
}

export interface Settings {
  checkUpdate?: boolean;
  checkBeta?: boolean;
  keepDataPeriodDays?: number;
  serverTimezone?: string;
  entryPage?: string;
  searchEngineIndex?: boolean;
  primaryBaseURL?: string;
  steamAPIKey?: string;
  nscd?: boolean;
  chromeExecutable?: string;
  dnsCache?: boolean;
  tlsExpiryNotifyDays?: number[];
  disableAuth?: boolean;
  trustProxy?: boolean;
}

export interface HeartbeatList {
  [key: string]: Heartbeat[];
}

export interface Heartbeat {
  id: number;
  monitorID: number;
  status: number;
  time: string;
  msg: string;
  important: boolean;
  duration: number;
  ping?: number;
}

export interface MonitorListResponse {
  [key: string]: Monitor;
}

export interface UptimeKumaEvent {
  event: string;
  data?: unknown;
}

export type EventCallback = (data?: unknown) => void;
