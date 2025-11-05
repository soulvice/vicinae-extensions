import { getPreferenceValues } from "@vicinae/api";
import fetch from "node-fetch";
import { createHash, pbkdf2Sync, randomBytes } from "crypto";

export interface Preferences {
  serverUrl: string;
  email: string;
  masterPassword: string;
  sessionTimeout: string;
  clipboardTimeout: string;
}

function getBitwardenConfig() {
  try {
    const prefs = getPreferenceValues<Preferences>();
    return {
      serverUrl: prefs.serverUrl || '',
      email: prefs.email || '',
      masterPassword: prefs.masterPassword || '',
      sessionTimeout: prefs.sessionTimeout || '60',
      clipboardTimeout: prefs.clipboardTimeout || '30'
    };
  } catch (error) {
    console.warn('Failed to get Bitwarden preferences, using defaults:', error);
    return {
      serverUrl: '',
      email: '',
      masterPassword: '',
      sessionTimeout: '60',
      clipboardTimeout: '30'
    };
  }
}

export interface VaultItem {
  id: string;
  organizationId?: string;
  folderId?: string;
  type: ItemType;
  name: string;
  notes?: string;
  favorite: boolean;
  login?: LoginData;
  secureNote?: SecureNoteData;
  card?: CardData;
  identity?: IdentityData;
  fields?: CustomField[];
  creationDate: string;
  revisionDate: string;
}

export enum ItemType {
  Login = 1,
  SecureNote = 2,
  Card = 3,
  Identity = 4
}

export interface LoginData {
  username?: string;
  password?: string;
  totp?: string;
  uris?: LoginUri[];
}

export interface LoginUri {
  uri?: string;
  match?: number;
}

export interface SecureNoteData {
  type: number;
}

export interface CardData {
  cardholderName?: string;
  brand?: string;
  number?: string;
  expMonth?: string;
  expYear?: string;
  code?: string;
}

export interface IdentityData {
  title?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  address1?: string;
  address2?: string;
  address3?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  company?: string;
  email?: string;
  phone?: string;
  ssn?: string;
  username?: string;
  passportNumber?: string;
  licenseNumber?: string;
}

export interface CustomField {
  name?: string;
  value?: string;
  type: number;
}

export interface Folder {
  id: string;
  name: string;
  revisionDate: string;
}

export interface AuthResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  refresh_token?: string;
  scope?: string;
  Key?: string;
  PrivateKey?: string;
}

export interface SyncResponse {
  folders: Folder[];
  ciphers: VaultItem[];
  domains?: any;
  profile?: any;
}

class BitwardenAPI {
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;
  private preferences: Preferences;
  public lastSuccessfulAuthMethod: string | null = null;
  private tokenStorageKey = 'vicinae-bitwarden-token';
  private authMethodStorageKey = 'vicinae-bitwarden-auth-method';

  constructor() {
    this.preferences = getBitwardenConfig();
    this.loadStoredTokens();
  }

  private loadStoredTokens(): void {
    try {
      const tokenData = localStorage.getItem(this.tokenStorageKey);
      const authMethod = localStorage.getItem(this.authMethodStorageKey);

      if (tokenData && authMethod) {
        const { token, expiry } = JSON.parse(tokenData);
        if (expiry > Date.now()) {
          this.accessToken = token;
          this.tokenExpiry = expiry;
          this.lastSuccessfulAuthMethod = authMethod;
          console.log(`📦 Restored cached token (expires in ${Math.floor((expiry - Date.now()) / 1000)}s)`);
        } else {
          console.log('🔄 Cached token expired, will need to re-authenticate');
          this.clearStoredTokens();
        }
      }
    } catch (error) {
      console.warn('Failed to load stored tokens:', error);
      this.clearStoredTokens();
    }
  }

  private saveTokens(): void {
    try {
      if (this.accessToken && this.tokenExpiry) {
        const tokenData = {
          token: this.accessToken,
          expiry: this.tokenExpiry
        };
        localStorage.setItem(this.tokenStorageKey, JSON.stringify(tokenData));

        if (this.lastSuccessfulAuthMethod) {
          localStorage.setItem(this.authMethodStorageKey, this.lastSuccessfulAuthMethod);
        }
        console.log('💾 Saved authentication tokens to cache');
      }
    } catch (error) {
      console.warn('Failed to save tokens:', error);
    }
  }

  private clearStoredTokens(): void {
    try {
      localStorage.removeItem(this.tokenStorageKey);
      localStorage.removeItem(this.authMethodStorageKey);
    } catch (error) {
      console.warn('Failed to clear stored tokens:', error);
    }
  }

  private get apiUrl(): string {
    return this.preferences.serverUrl.replace(/\/$/, '');
  }

  private async makeRequest(endpoint: string, options: any = {}): Promise<any> {
    const url = `${this.apiUrl}${endpoint}`;
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'User-Agent': 'Vicinae-Bitwarden-Extension/1.0.0',
    };

    if (this.accessToken && endpoint !== '/identity/connect/token') {
      defaultHeaders['Authorization'] = `Bearer ${this.accessToken}`;
    }

    console.log(`Making request to: ${url}`);
    console.log(`Headers:`, defaultHeaders);

    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    });

    console.log(`Response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API Error: ${response.status} - ${errorText}`);
      throw new Error(`API Error (${response.status}): ${errorText}`);
    }

    const responseData = await response.json();
    console.log(`Response data:`, responseData);
    return responseData;
  }

  private hashPassword(password: string, email: string): string {
    // Proper Bitwarden password hashing implementation
    const emailLower = email.toLowerCase().trim();

    // First round: PBKDF2 with email as salt
    const key = pbkdf2Sync(password, emailLower, 100000, 32, 'sha256');

    // Second round: PBKDF2 with password as salt
    const hashedKey = pbkdf2Sync(key, password, 1, 32, 'sha256');

    return hashedKey.toString('base64');
  }

  private async authenticate(): Promise<void> {
    if (this.isTokenValid()) {
      return;
    }

    console.log('Starting Bitwarden authentication...');

    // Define all authentication methods
    const allAuthMethods = [
      {
        name: 'Proper Bitwarden hash',
        password: this.hashPassword(this.preferences.masterPassword, this.preferences.email)
      },
      {
        name: 'Simple PBKDF2 hash',
        password: pbkdf2Sync(this.preferences.masterPassword, this.preferences.email.toLowerCase(), 100000, 32, 'sha256').toString('base64')
      },
      {
        name: 'Raw password',
        password: this.preferences.masterPassword
      }
    ];

    // Smart method selection: try last successful method first
    let authMethods = [...allAuthMethods];
    if (this.lastSuccessfulAuthMethod) {
      const lastSuccessfulMethod = authMethods.find(m => m.name === this.lastSuccessfulAuthMethod);
      if (lastSuccessfulMethod) {
        // Move last successful method to front
        authMethods = [lastSuccessfulMethod, ...authMethods.filter(m => m.name !== this.lastSuccessfulAuthMethod)];
        console.log(`Trying last successful method first: ${this.lastSuccessfulAuthMethod}`);
      }
    }

    let lastError: Error | null = null;

    for (const method of authMethods) {
      try {
        console.log(`Trying authentication method: ${method.name}`);
        await this.tryAuthentication(method.password);
        console.log(`✅ Authentication successful with method: ${method.name}`);
        this.lastSuccessfulAuthMethod = method.name;
        this.saveTokens();
        return;
      } catch (error) {
        console.log(`❌ Authentication failed with method: ${method.name}`);
        lastError = error as Error;

        // Check if it's a rate limiting error - stop trying other methods
        if (error instanceof Error && error.message.includes('Too many login requests')) {
          console.log('🛑 Rate limit detected - stopping further attempts');
          throw error;
        }

        // Add a small delay between attempts to avoid triggering rate limits
        if (authMethods.indexOf(method) < authMethods.length - 1) {
          console.log('⏱️  Waiting 2 seconds before next attempt...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }

    // If all methods failed, throw the last error
    throw lastError || new Error('All authentication methods failed');
  }

  private async tryAuthentication(password: string): Promise<void> {
    const authData = {
      grant_type: 'password',
      username: this.preferences.email,
      password: password,
      scope: 'api offline_access',
      client_id: 'web',
      deviceType: 0,
      deviceIdentifier: this.generateDeviceId(),
      deviceName: 'Vicinae Extension',
      // Add these for better Vaultwarden compatibility
      devicePushToken: '',
      twoFactorToken: '',
      twoFactorProvider: '',
      twoFactorRemember: 0
    };

    const formData = new URLSearchParams();
    Object.entries(authData).forEach(([key, value]) => {
      formData.append(key, value.toString());
    });

    const response = await this.makeRequest('/identity/connect/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    this.accessToken = response.access_token;
    this.tokenExpiry = Date.now() + (response.expires_in * 1000) - 60000; // 1 min buffer
  }

  private isTokenValid(): boolean {
    return this.accessToken !== null && Date.now() < this.tokenExpiry;
  }

  private generateDeviceId(): string {
    // Generate a consistent device ID that matches Bitwarden format
    const data = `vicinae-${this.preferences.email}`;
    const hash = createHash('sha256').update(data).digest('hex');

    // Format as UUID-like string (Bitwarden expects this format)
    return [
      hash.substring(0, 8),
      hash.substring(8, 12),
      hash.substring(12, 16),
      hash.substring(16, 20),
      hash.substring(20, 32)
    ].join('-');
  }

  async ensureAuthenticated(): Promise<void> {
    await this.authenticate();
  }

  // Utility method to reset authentication state (useful after rate limits)
  resetAuthenticationState(): void {
    this.accessToken = null;
    this.tokenExpiry = 0;
    this.lastSuccessfulAuthMethod = null;
    this.clearStoredTokens();
    console.log('🔄 Authentication state reset');
  }

  async sync(): Promise<SyncResponse> {
    try {
      await this.ensureAuthenticated();
      console.log('Authentication successful, making sync request...');
      const syncData = await this.makeRequest('/api/sync');
      console.log(`Sync successful, found ${syncData.ciphers?.length || 0} ciphers and ${syncData.folders?.length || 0} folders`);
      return syncData;
    } catch (error) {
      console.error('Sync failed:', error);
      throw error;
    }
  }

  async getCiphers(): Promise<VaultItem[]> {
    try {
      const syncData = await this.sync();
      console.log(`Retrieved ${syncData.ciphers?.length || 0} ciphers from sync data`);
      return syncData.ciphers || [];
    } catch (error) {
      console.error('Failed to get ciphers:', error);
      throw error;
    }
  }

  async getFolders(): Promise<Folder[]> {
    const syncData = await this.sync();
    return syncData.folders;
  }

  async searchCiphers(query: string): Promise<VaultItem[]> {
    const ciphers = await this.getCiphers();
    const searchLower = query.toLowerCase();

    return ciphers.filter(cipher => {
      // Search in name
      if (cipher.name.toLowerCase().includes(searchLower)) return true;

      // Search in login username/URI
      if (cipher.login?.username?.toLowerCase().includes(searchLower)) return true;
      if (cipher.login?.uris?.some(uri => uri.uri?.toLowerCase().includes(searchLower))) return true;

      // Search in notes
      if (cipher.notes?.toLowerCase().includes(searchLower)) return true;

      // Search in card details
      if (cipher.card?.cardholderName?.toLowerCase().includes(searchLower)) return true;
      if (cipher.card?.brand?.toLowerCase().includes(searchLower)) return true;

      // Search in identity details
      if (cipher.identity?.firstName?.toLowerCase().includes(searchLower)) return true;
      if (cipher.identity?.lastName?.toLowerCase().includes(searchLower)) return true;
      if (cipher.identity?.company?.toLowerCase().includes(searchLower)) return true;

      return false;
    });
  }

  async getCiphersByType(type: ItemType): Promise<VaultItem[]> {
    const ciphers = await this.getCiphers();
    return ciphers.filter(cipher => cipher.type === type);
  }
}

// Singleton instance
let apiInstance: BitwardenAPI | null = null;

export function getBitwardenAPI(): BitwardenAPI {
  if (!apiInstance) {
    apiInstance = new BitwardenAPI();
  }
  return apiInstance;
}

// TOTP helper functions
export function generateTOTP(secret: string): string | null {
  try {
    // Remove spaces and convert to uppercase
    const cleanSecret = secret.replace(/\s/g, '').toUpperCase();

    // Base32 decode (simplified implementation)
    const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const binary = cleanSecret
      .split('')
      .map(char => {
        const index = base32Chars.indexOf(char);
        return index >= 0 ? index.toString(2).padStart(5, '0') : '';
      })
      .join('');

    if (binary.length % 8 !== 0) return null;

    const bytes = [];
    for (let i = 0; i < binary.length; i += 8) {
      bytes.push(parseInt(binary.substr(i, 8), 2));
    }

    // TOTP calculation
    const timeStep = 30;
    const time = Math.floor(Date.now() / 1000 / timeStep);
    const timeBuffer = Buffer.alloc(8);
    timeBuffer.writeUInt32BE(Math.floor(time / 0x100000000), 0);
    timeBuffer.writeUInt32BE(time & 0xffffffff, 4);

    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha1', Buffer.from(bytes));
    hmac.update(timeBuffer);
    const hash = hmac.digest();

    const offset = hash[hash.length - 1] & 0xf;
    const code = ((hash[offset] & 0x7f) << 24) |
                 ((hash[offset + 1] & 0xff) << 16) |
                 ((hash[offset + 2] & 0xff) << 8) |
                 (hash[offset + 3] & 0xff);

    return (code % 1000000).toString().padStart(6, '0');
  } catch (error) {
    console.error('TOTP generation error:', error);
    return null;
  }
}

export function getTOTPTimeRemaining(): number {
  const now = Math.floor(Date.now() / 1000);
  return 30 - (now % 30);
}

// Password generation utility
export interface PasswordOptions {
  length: number;
  includeUppercase: boolean;
  includeLowercase: boolean;
  includeNumbers: boolean;
  includeSymbols: boolean;
  excludeSimilar: boolean;
  excludeAmbiguous: boolean;
}

export function generatePassword(options: PasswordOptions): string {
  let charset = '';

  if (options.includeLowercase) {
    charset += options.excludeSimilar ? 'abcdefghjkmnpqrstuvwxyz' : 'abcdefghijklmnopqrstuvwxyz';
  }
  if (options.includeUppercase) {
    charset += options.excludeSimilar ? 'ABCDEFGHJKMNPQRSTUVWXYZ' : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  }
  if (options.includeNumbers) {
    charset += options.excludeSimilar ? '23456789' : '0123456789';
  }
  if (options.includeSymbols) {
    charset += options.excludeAmbiguous ? '!@#$%^&*()_+-=[]{}|;:,.<>?' : '!@#$%^&*()_+-=[]{}|;:,.<>?`~"\'\\//';
  }

  if (charset === '') {
    throw new Error('At least one character type must be selected');
  }

  let password = '';
  const randomBytesLength = Math.max(options.length * 2, 256);
  const randomBytesArray = randomBytes(randomBytesLength);

  for (let i = 0; i < options.length; i++) {
    const randomIndex = randomBytesArray[i % randomBytesArray.length] % charset.length;
    password += charset[randomIndex];
  }

  return password;
}

// Clipboard utilities
export async function copyToClipboard(text: string, clearAfter?: number): Promise<void> {
  // Use wl-copy for Wayland clipboard
  const { execSync } = require('child_process');
  execSync(`echo -n "${text.replace(/"/g, '\\"')}" | wl-copy`);

  if (clearAfter && clearAfter > 0) {
    setTimeout(() => {
      try {
        execSync('echo -n "" | wl-copy');
      } catch (error) {
        console.error('Failed to clear clipboard:', error);
      }
    }, clearAfter * 1000);
  }
}

// Utility functions for formatting and display
export function getItemIcon(type: ItemType): string {
  switch (type) {
    case ItemType.Login: return 'Key';
    case ItemType.SecureNote: return 'Document';
    case ItemType.Card: return 'CreditCard';
    case ItemType.Identity: return 'Person';
    default: return 'Circle';
  }
}

export function getItemTypeLabel(type: ItemType): string {
  switch (type) {
    case ItemType.Login: return 'Login';
    case ItemType.SecureNote: return 'Secure Note';
    case ItemType.Card: return 'Card';
    case ItemType.Identity: return 'Identity';
    default: return 'Unknown';
  }
}

export function formatCardNumber(number?: string): string {
  if (!number) return 'No number';
  // Show only last 4 digits
  return `****-****-****-${number.slice(-4)}`;
}

export function getDisplayUri(item: VaultItem): string {
  if (item.login?.uris && item.login.uris.length > 0) {
    const uri = item.login.uris[0].uri;
    if (uri) {
      try {
        const url = new URL(uri);
        return url.hostname;
      } catch {
        return uri;
      }
    }
  }
  return '';
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}