import { join } from "path";
import { homedir } from "os";

const CACHE_DIR = join(homedir(), '.local', '.airportmap');
const CACHE_EXPIRY_HOURS = 24; // 24h

interface CacheEntry {
  data: any;
  timestamp: number;
}

export class AirportCache {
  private cacheDir: string;

  constructor() {
    this.cacheDir = CACHE_DIR;
    this.ensureCacheDir();
  }

  private async ensureCacheDir(): Promise<void> {
    try {
      await Bun.write(join(this.cacheDir, '.gitkeep'), '');
    } catch (error) {
    }
  }

  private getCacheFilePath(icao: string): string {
    return join(this.cacheDir, `${icao.toLowerCase()}.json`);
  }

  private isExpired(timestamp: number): boolean {
    const now = Date.now();
    const expiryTime = CACHE_EXPIRY_HOURS * 60 * 60 * 1000; // Convert to milliseconds
    return (now - timestamp) > expiryTime;
  }

  async get(icao: string): Promise<any | null> {
    try {
      const cacheFile = Bun.file(this.getCacheFilePath(icao));
      
      if (!(await cacheFile.exists())) {
        return null;
      }

      const cacheEntry: CacheEntry = await cacheFile.json();
      
      if (this.isExpired(cacheEntry.timestamp)) {
        // Cache is expired, remove the file
        await this.remove(icao);
        return null;
      }

      return cacheEntry.data;
    } catch (error) {
      return null;
    }
  }

  async set(icao: string, data: any): Promise<void> {
    try {
      const cacheEntry: CacheEntry = {
        data,
        timestamp: Date.now()
      };

      const cacheFilePath = this.getCacheFilePath(icao);
      await Bun.write(cacheFilePath, JSON.stringify(cacheEntry, null, 2));
    } catch (error) {
      console.warn(`Warning: Could not write to cache: ${error.message}`);
    }
  }

  async remove(icao: string): Promise<void> {
    try {
      const cacheFilePath = this.getCacheFilePath(icao);
      const file = Bun.file(cacheFilePath);
      
      if (await file.exists()) {
        await Bun.$`rm ${cacheFilePath}`;
      }
    } catch (error) {
    }
  }

  async clear(): Promise<void> {
    try {
      await Bun.$`rm -rf ${this.cacheDir}`;
      await this.ensureCacheDir();
    } catch (error) {
    }
  }

  async size(): Promise<number> {
    try {
      const files = await Bun.$`find ${this.cacheDir} -name "*.json" | wc -l`.text();
      return parseInt(files.trim());
    } catch (error) {
      return 0;
    }
  }
}