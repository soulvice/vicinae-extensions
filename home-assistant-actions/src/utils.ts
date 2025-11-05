import { getPreferenceValues } from "@vicinae/api";
import fetch from "node-fetch";

interface Preferences {
  haUrl: string;
  haToken: string;
  favoriteEntities: string;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

// Simple cache manager for Home Assistant extension
class HACacheManager {
  private cache = new Map<string, CacheEntry<any>>();

  getCached<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl * 1000) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  setCached<T>(key: string, data: T, ttlSeconds: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlSeconds
    });
  }

  clearCache(keyPattern?: string): void {
    if (keyPattern) {
      const regex = new RegExp(keyPattern);
      for (const key of this.cache.keys()) {
        if (regex.test(key)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }
}

// Singleton cache instance
let haCacheManager: HACacheManager | null = null;

function getHACacheManager(): HACacheManager {
  if (!haCacheManager) {
    haCacheManager = new HACacheManager();
  }
  return haCacheManager;
}

function getHAConfig() {
  try {
    const prefs = getPreferenceValues<Preferences>();
    return {
      url: prefs.haUrl || '',
      token: prefs.haToken || '',
      refreshInterval: 5,
      enableWebsocket: true
    };
  } catch (error) {
    console.warn('Failed to get Home Assistant preferences, using defaults:', error);
    return {
      url: '',
      token: '',
      refreshInterval: 5,
      enableWebsocket: true
    };
  }
}

// WebSocket connection for real-time updates
let websocket: WebSocket | null = null;
let entityUpdateCallbacks = new Map<string, (entity: HAEntity) => void>();

export interface HAEntity {
  entity_id: string;
  state: string;
  attributes: {
    friendly_name?: string;
    brightness?: number;
    [key: string]: any;
  };
  last_changed: string;
}


export async function callService(
  domain: string,
  service: string,
  entityId?: string,
  data?: Record<string, any>
) {
  const config = getHAConfig();
  const url = `${config.url}/api/services/${domain}/${service}`;

  const body: any = data || {};
  if (entityId) {
    body.entity_id = entityId;
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Home Assistant API error: ${response.statusText}`);
  }

  return response.json();
}

export async function getStates(): Promise<HAEntity[]> {
  const config = getHAConfig();
  const cacheManager = getHACacheManager();

  // Try to get cached states first
  const cachedStates = cacheManager.getCached<HAEntity[]>('ha:states');
  if (cachedStates) {
    console.log('Using cached Home Assistant states');
    return cachedStates;
  }

  console.log('Fetching fresh Home Assistant states');
  const url = `${config.url}/api/states`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Home Assistant API error: ${response.statusText}`);
  }

  const states = (await response.json()) as HAEntity[];

  // Cache states for refresh interval
  cacheManager.setCached('ha:states', states, config.refreshInterval);

  return states;
}

export async function getState(entityId: string): Promise<HAEntity> {
  const config = getHAConfig();
  const url = `${config.url}/api/states/${entityId}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Home Assistant API error: ${response.statusText}`);
  }

  return (await response.json()) as HAEntity;
}

// Real-time WebSocket connection for entity updates
export function initializeWebSocket(): void {
  const config = getHAConfig();

  if (!config.enableWebsocket) {
    console.log('WebSocket disabled in config');
    return;
  }

  if (websocket && websocket.readyState === WebSocket.OPEN) {
    console.log('WebSocket already connected');
    return;
  }

  try {
    const wsUrl = config.url.replace(/^http/, 'ws') + '/api/websocket';
    console.log('Initializing WebSocket connection to:', wsUrl);
    websocket = new WebSocket(wsUrl);

    websocket.onopen = () => {
      console.log('Home Assistant WebSocket connected');
      // Send authentication message
      websocket?.send(JSON.stringify({
        type: 'auth',
        access_token: config.token
      }));
    };

    websocket.onmessage = (event) => {
      const message = JSON.parse(event.data);

      if (message.type === 'auth_required') {
        // Send auth again if required
        websocket?.send(JSON.stringify({
          type: 'auth',
          access_token: config.token
        }));
      } else if (message.type === 'auth_ok') {
        console.log('Home Assistant WebSocket authenticated');
        // Subscribe to state changes
        websocket?.send(JSON.stringify({
          id: 1,
          type: 'subscribe_events',
          event_type: 'state_changed'
        }));
      } else if (message.type === 'event' && message.event?.event_type === 'state_changed') {
        // Handle state change events
        const newState = message.event.data.new_state;
        if (newState) {
          handleEntityUpdate(newState);
        }
      }
    };

    websocket.onclose = () => {
      console.log('Home Assistant WebSocket disconnected');
      websocket = null;
      // Attempt to reconnect after 5 seconds
      setTimeout(initializeWebSocket, 5000);
    };

    websocket.onerror = (error) => {
      console.error('Home Assistant WebSocket error:', error);
    };

  } catch (error) {
    console.error('Failed to initialize Home Assistant WebSocket:', error);
  }
}

function handleEntityUpdate(entity: HAEntity): void {
  console.log('WebSocket entity update received:', entity.entity_id, entity.state);

  // Clear cached states to force refresh
  getHACacheManager().clearCache('ha:states');

  // Notify subscribers
  const callback = entityUpdateCallbacks.get(entity.entity_id);
  if (callback) {
    callback(entity);
  }

  // Notify wildcard subscribers
  const wildcardCallback = entityUpdateCallbacks.get('*');
  if (wildcardCallback) {
    wildcardCallback(entity);
  }
}

export function subscribeToEntityUpdates(entityId: string, callback: (entity: HAEntity) => void): () => void {
  entityUpdateCallbacks.set(entityId, callback);

  // Initialize WebSocket if not already done
  initializeWebSocket();

  // Return unsubscribe function
  return () => {
    entityUpdateCallbacks.delete(entityId);
  };
}

export function subscribeToAllEntityUpdates(callback: (entity: HAEntity) => void): () => void {
  return subscribeToEntityUpdates('*', callback);
}

export function clearStatesCache(): void {
  getHACacheManager().clearCache('ha:states');
}

// Get fresh state for a specific entity (bypasses cache)
export async function getFreshEntityState(entityId: string): Promise<HAEntity> {
  const config = getHAConfig();
  const url = `${config.url}/api/states/${entityId}`;

  console.log(`Fetching fresh state for entity: ${entityId}`);

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get fresh state for ${entityId}: ${response.statusText}`);
  }

  const freshState = (await response.json()) as HAEntity;
  console.log(`Fresh state for ${entityId}: ${freshState.state}`);
  return freshState;
}

export function closeWebSocket(): void {
  if (websocket) {
    websocket.close();
    websocket = null;
  }
  entityUpdateCallbacks.clear();
}

export function getDomain(entityId: string): string {
  return entityId.split(".")[0];
}

export function getEntityName(entity: HAEntity): string {
  return entity.attributes.friendly_name || entity.entity_id;
}

export function getFavoriteEntities(): string[] {
  try {
    const prefs = getPreferenceValues<Preferences>();
    const favorites = prefs.favoriteEntities || '';
    return favorites
      .split(',')
      .map(id => id.trim())
      .filter(id => id.length > 0);
  } catch (error) {
    console.warn('Failed to get favorite entities:', error);
    return [];
  }
}

export function getEntityIcon(entity: HAEntity): string {
  const domain = getDomain(entity.entity_id);
  const deviceClass = entity.attributes.device_class;
  const state = entity.state;

  switch (domain) {
    case 'light':
      return state === 'on' ? '💡' : '🔌';
    case 'switch':
      return state === 'on' ? '🔛' : '⭕';
    case 'binary_sensor':
      if (deviceClass === 'door' || deviceClass === 'window') {
        return state === 'on' ? '🚪' : '🔒';
      }
      if (deviceClass === 'motion') {
        return state === 'on' ? '🏃' : '🚶';
      }
      return state === 'on' ? '✅' : '❌';
    case 'sensor':
      if (deviceClass === 'temperature') return '🌡️';
      if (deviceClass === 'humidity') return '💧';
      if (deviceClass === 'battery') return '🔋';
      if (deviceClass === 'energy' || deviceClass === 'power') return '⚡';
      return '📊';
    case 'climate':
      return '🌡️';
    case 'cover':
      return state === 'open' ? '📖' : '📕';
    case 'fan':
      return state === 'on' ? '🌪️' : '💨';
    case 'media_player':
      return state === 'playing' ? '▶️' : '⏸️';
    case 'camera':
      return '📷';
    case 'alarm_control_panel':
      return state === 'armed_home' || state === 'armed_away' ? '🔒' : '🏠';
    case 'person':
      return state === 'home' ? '🏠' : '🚗';
    case 'device_tracker':
      return state === 'home' ? '📍' : '🌍';
    case 'lock':
      return state === 'locked' ? '🔒' : '🔓';
    case 'vacuum':
      return state === 'cleaning' ? '🧹' : '🤖';
    default:
      return '🏠';
  }
}