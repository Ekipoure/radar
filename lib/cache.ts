// Simple in-memory cache for API responses
interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class APICache {
  private cache = new Map<string, CacheEntry>();
  private maxSize = 100; // Maximum number of cache entries

  set(key: string, data: any, ttl: number = 30000): void {
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Get cache statistics
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Create singleton instance
const apiCache = new APICache();

export default apiCache;

// Helper function to generate cache keys
export function generateCacheKey(prefix: string, params: Record<string, any>): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&');
  
  return `${prefix}:${sortedParams}`;
}

// Helper function to get cached data or fetch new data
export async function getCachedData<T>(
  cacheKey: string,
  fetchFunction: () => Promise<T>,
  ttl: number = 30000
): Promise<T> {
  // Try to get from cache first
  const cachedData = apiCache.get(cacheKey);
  if (cachedData !== null) {
    console.log(`Cache hit for key: ${cacheKey}`);
    return cachedData;
  }

  console.log(`Cache miss for key: ${cacheKey}, fetching new data`);
  
  // Fetch new data
  const data = await fetchFunction();
  
  // Cache the result
  apiCache.set(cacheKey, data, ttl);
  
  return data;
}
