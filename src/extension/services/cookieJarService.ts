import { Cookie, CookieJar } from 'tough-cookie';
import { StorageService } from '../storage/storageService';
import { ParsedCookie } from '../../shared/models';

const COOKIES_FILE = 'cookies.json';

interface SerializedCookieJar {
  version: string;
  cookies: any;
}

export class CookieJarService {
  private jar: CookieJar;
  private enabled: boolean = true;

  constructor(private storageService: StorageService) {
    this.jar = new CookieJar();
  }

  async initialize(): Promise<void> {
    try {
      const data = await this.storageService.readJson<SerializedCookieJar>(COOKIES_FILE);
      if (data?.cookies) {
        this.jar = await CookieJar.deserialize(data.cookies);
      }
    } catch {
      this.jar = new CookieJar();
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  async getCookieString(url: string): Promise<string> {
    if (!this.enabled) {
      return '';
    }
    try {
      return await this.jar.getCookieString(url);
    } catch {
      return '';
    }
  }

  async setCookiesFromResponse(url: string, setCookieHeaders: string[]): Promise<void> {
    if (!this.enabled) {
      return;
    }
    
    for (const cookieStr of setCookieHeaders) {
      try {
        await this.jar.setCookie(cookieStr, url, { ignoreError: true });
      } catch {
        // Ignore invalid cookies
      }
    }
    
    await this.persist();
  }

  async clearAll(): Promise<void> {
    this.jar = new CookieJar();
    await this.persist();
  }

  parseSetCookieHeaders(setCookieHeaders: string[]): ParsedCookie[] {
    const cookies: ParsedCookie[] = [];
    
    for (const header of setCookieHeaders) {
      try {
        const cookie = Cookie.parse(header);
        if (cookie) {
          cookies.push({
            name: cookie.key,
            value: cookie.value,
            domain: cookie.domain || undefined,
            path: cookie.path || undefined,
            expires: cookie.expires instanceof Date 
              ? cookie.expires.toISOString() 
              : cookie.expires === 'Infinity' ? 'Session' : undefined,
            httpOnly: cookie.httpOnly,
            secure: cookie.secure,
            sameSite: cookie.sameSite || undefined
          });
        }
      } catch {
        // Skip invalid cookies
      }
    }
    
    return cookies;
  }

  private async persist(): Promise<void> {
    try {
      const serialized = await this.jar.serialize();
      await this.storageService.writeJson(COOKIES_FILE, {
        version: '1.0',
        cookies: serialized
      });
    } catch {
      // Ignore persistence errors
    }
  }
}
