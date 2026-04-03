// ─── Extension Developer SDK ────────────────────────────────────────
// Provides the public API that extension developers use to integrate
// with HTMLess: lifecycle hooks, event handling, custom fields,
// routes, widgets, settings, data access, storage, and logging.

// ─── Types ──────────────────────────────────────────────────────────

export interface ExtensionContext {
  spaceId: string;
  extensionKey: string;
  extensionVersion: string;
  apiBaseUrl: string;
}

export interface EventPayload {
  eventType: string;
  spaceId: string;
  timestamp: string;
  data: Record<string, unknown>;
}

export interface CustomFieldType {
  key: string;
  name: string;
  type: 'text' | 'number' | 'json' | 'select';
  config?: Record<string, unknown>;
  validator?: (value: unknown) => boolean | string;
}

export type WidgetLocation = 'dashboard' | 'sidebar' | 'entry-header';

export interface WidgetConfig {
  key: string;
  name: string;
  location: WidgetLocation;
  /** HTML string or template identifier for the widget UI */
  render: string;
}

export interface SettingsField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'select' | 'json';
  default?: unknown;
  options?: { label: string; value: string }[];
}

export interface SettingsPanelConfig {
  key: string;
  name: string;
  fields: SettingsField[];
}

export interface QueryOptions {
  limit?: number;
  offset?: number;
  where?: Record<string, unknown>;
  orderBy?: Record<string, 'asc' | 'desc'>;
}

export interface Entry {
  id: string;
  slug: string;
  contentTypeKey: string;
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface Asset {
  id: string;
  filename: string;
  mimeType: string;
  bytes: number;
  width?: number | null;
  height?: number | null;
  alt?: string | null;
  storageKey: string;
  createdAt: string;
}

export type RouteMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

export type RouteHandler = (req: RouteRequest) => Promise<RouteResponse>;

export interface RouteRequest {
  method: RouteMethod;
  path: string;
  params: Record<string, string>;
  query: Record<string, string>;
  body: unknown;
  spaceId: string;
  extensionKey: string;
}

export interface RouteResponse {
  status?: number;
  body: unknown;
  headers?: Record<string, string>;
}

export type LifecycleHandler = (context: ExtensionContext) => Promise<void>;
export type EventHandler = (payload: EventPayload) => Promise<void>;

// ─── SDK Class ──────────────────────────────────────────────────────

/**
 * The HTMLess Extension SDK.
 *
 * Extension developers instantiate this (or receive it from the runtime)
 * to register hooks, fields, routes, widgets, settings, and access
 * space-scoped data.
 *
 * All data access methods are scoped to the space the extension is
 * installed in; spaceId is enforced by the runtime.
 */
export class HTMLessExtensionSDK {
  readonly context: ExtensionContext;

  // ─── Internal registries (populated by the extension) ───
  private _installHandler: LifecycleHandler | null = null;
  private _uninstallHandler: LifecycleHandler | null = null;
  private _eventHandlers = new Map<string, EventHandler[]>();
  private _fieldTypes: CustomFieldType[] = [];
  private _routes: { method: RouteMethod; path: string; handler: RouteHandler }[] = [];
  private _widgets: WidgetConfig[] = [];
  private _settingsPanels: SettingsPanelConfig[] = [];

  // Data-access callbacks injected by the runtime
  private _dataAccess: DataAccessCallbacks;

  constructor(context: ExtensionContext, dataAccess: DataAccessCallbacks) {
    this.context = context;
    this._dataAccess = dataAccess;
  }

  // ─── Lifecycle hooks ──────────────────────────────────────────────

  onInstall(handler: LifecycleHandler): void {
    this._installHandler = handler;
  }

  onUninstall(handler: LifecycleHandler): void {
    this._uninstallHandler = handler;
  }

  // ─── Event hooks ──────────────────────────────────────────────────

  onEvent(eventType: string, handler: EventHandler): void {
    const list = this._eventHandlers.get(eventType) ?? [];
    list.push(handler);
    this._eventHandlers.set(eventType, list);
  }

  // ─── Custom fields ───────────────────────────────────────────────

  registerFieldType(config: CustomFieldType): void {
    this._fieldTypes.push(config);
  }

  // ─── Custom routes ────────────────────────────────────────────────

  registerRoute(method: RouteMethod | string, path: string, handler: RouteHandler): void {
    this._routes.push({ method: method as RouteMethod, path, handler });
  }

  // ─── Admin UI widgets ─────────────────────────────────────────────

  registerWidget(config: WidgetConfig): void {
    this._widgets.push(config);
  }

  registerSettingsPanel(config: SettingsPanelConfig): void {
    this._settingsPanels.push(config);
  }

  // ─── Data access (scoped to the space) ────────────────────────────

  async getEntries(typeKey: string, options?: QueryOptions): Promise<Entry[]> {
    return this._dataAccess.getEntries(this.context.spaceId, typeKey, options);
  }

  async createEntry(typeKey: string, data: object): Promise<Entry> {
    return this._dataAccess.createEntry(this.context.spaceId, typeKey, data);
  }

  async getAssets(options?: QueryOptions): Promise<Asset[]> {
    return this._dataAccess.getAssets(this.context.spaceId, options);
  }

  // ─── Storage (per-extension key-value store) ──────────────────────

  async getConfig<T>(key: string): Promise<T | null> {
    return this._dataAccess.getConfig<T>(this.context.spaceId, this.context.extensionKey, key);
  }

  async setConfig<T>(key: string, value: T): Promise<void> {
    return this._dataAccess.setConfig(this.context.spaceId, this.context.extensionKey, key, value);
  }

  // ─── Logging ──────────────────────────────────────────────────────

  log(level: 'info' | 'warn' | 'error', message: string, meta?: object): void {
    const prefix = `[ext:${this.context.extensionKey}][${this.context.spaceId}]`;
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    // eslint-disable-next-line no-console
    console[level](`${prefix} ${message}${metaStr}`);
  }

  // ─── Accessors for the runtime ────────────────────────────────────

  /** @internal */
  get installHandler(): LifecycleHandler | null {
    return this._installHandler;
  }

  /** @internal */
  get uninstallHandler(): LifecycleHandler | null {
    return this._uninstallHandler;
  }

  /** @internal */
  get eventHandlers(): ReadonlyMap<string, EventHandler[]> {
    return this._eventHandlers;
  }

  /** @internal */
  get fieldTypes(): readonly CustomFieldType[] {
    return this._fieldTypes;
  }

  /** @internal */
  get routes(): readonly { method: RouteMethod; path: string; handler: RouteHandler }[] {
    return this._routes;
  }

  /** @internal */
  get widgets(): readonly WidgetConfig[] {
    return this._widgets;
  }

  /** @internal */
  get settingsPanels(): readonly SettingsPanelConfig[] {
    return this._settingsPanels;
  }
}

// ─── Data Access Callback Interface ─────────────────────────────────
// The runtime injects these so the SDK never touches Prisma directly.

export interface DataAccessCallbacks {
  getEntries(spaceId: string, typeKey: string, options?: QueryOptions): Promise<Entry[]>;
  createEntry(spaceId: string, typeKey: string, data: object): Promise<Entry>;
  getAssets(spaceId: string, options?: QueryOptions): Promise<Asset[]>;
  getConfig<T>(spaceId: string, extensionKey: string, key: string): Promise<T | null>;
  setConfig(spaceId: string, extensionKey: string, key: string, value: unknown): Promise<void>;
}
