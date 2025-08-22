import { NextRequest, NextResponse } from 'next/server';

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  vary?: string[]; // Headers to vary cache by
  tags?: string[]; // Cache tags for invalidation
  skipCache?: (req: NextRequest) => boolean;
  generateKey?: (req: NextRequest) => string;
  compress?: boolean;
}

interface CacheEntry {
  data: unknown;
  headers: Record<string, string>;
  status: number;
  timestamp: number;
  ttl: number;
  tags: string[];
  etag: string;
}

class APICache {
  private cache = new Map<string, CacheEntry>();
  private tagIndex = new Map<string, Set<string>>(); // tag -> cache keys
  
  constructor() {
    // 定期清理过期缓存
    setInterval(() => this.cleanup(), 5 * 60 * 1000); // 5分钟
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.delete(key);
      }
    }
  }

  private generateETag(data: unknown): string {
    const hash = this.hash(JSON.stringify(data));
    return `"${hash}"`;
  }

  private hash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 32bit int
    }
    return Math.abs(hash).toString(36);
  }

  private generateKey(req: NextRequest, options: CacheOptions): string {
    if (options.generateKey) {
      return options.generateKey(req);
    }

    const url = new URL(req.url);
    let key = `${req.method}:${url.pathname}${url.search}`;
    
    // 根据指定的headers来变化缓存key
    if (options.vary) {
      const varyValues = options.vary
        .map(header => `${header}:${req.headers.get(header) || ''}`)
        .join('|');
      key += `|${varyValues}`;
    }
    
    return key;
  }

  set(key: string, response: Response, data: unknown, options: CacheOptions) {
    const ttl = options.ttl || 5 * 60 * 1000; // 默认5分钟
    const tags = options.tags || [];
    const etag = this.generateETag(data);
    
    const entry: CacheEntry = {
      data,
      headers: Object.fromEntries(response.headers.entries()),
      status: response.status,
      timestamp: Date.now(),
      ttl,
      tags,
      etag,
    };

    this.cache.set(key, entry);
    
    // 更新tag索引
    tags.forEach(tag => {
      if (!this.tagIndex.has(tag)) {
        this.tagIndex.set(tag, new Set());
      }
      this.tagIndex.get(tag)!.add(key);
    });
  }

  get(key: string): CacheEntry | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.delete(key);
      return null;
    }
    
    return entry;
  }

  delete(key: string) {
    const entry = this.cache.get(key);
    if (entry) {
      // 清理tag索引
      entry.tags.forEach(tag => {
        const keys = this.tagIndex.get(tag);
        if (keys) {
          keys.delete(key);
          if (keys.size === 0) {
            this.tagIndex.delete(tag);
          }
        }
      });
    }
    
    this.cache.delete(key);
  }

  // 根据tag清理缓存
  invalidateByTags(tags: string[]) {
    const keysToDelete = new Set<string>();
    
    tags.forEach(tag => {
      const keys = this.tagIndex.get(tag);
      if (keys) {
        keys.forEach(key => keysToDelete.add(key));
      }
    });
    
    keysToDelete.forEach(key => this.delete(key));
  }

  // 获取缓存统计
  getStats() {
    return {
      size: this.cache.size,
      tags: this.tagIndex.size,
      memoryUsage: this.estimateMemoryUsage(),
    };
  }

  private estimateMemoryUsage(): number {
    let total = 0;
    for (const entry of this.cache.values()) {
      total += JSON.stringify(entry).length * 2; // 估算字符串占用字节数
    }
    return total;
  }

  clear() {
    this.cache.clear();
    this.tagIndex.clear();
  }
}

// 全局缓存实例
const apiCache = new APICache();

/**
 * API缓存中间件
 */
export function withCache(options: CacheOptions = {}) {
  return function cacheMiddleware(handler: (req: NextRequest, context?: unknown) => Promise<Response>) {
    return async function(req: NextRequest, context?: unknown) {
      // 跳过缓存的条件
      if (
        req.method !== 'GET' || 
        options.skipCache?.(req) ||
        req.headers.get('cache-control') === 'no-cache'
      ) {
        return handler(req, context);
      }

      const cacheKey = apiCache.generateKey(req, options);
      
      // 检查ETag
      const ifNoneMatch = req.headers.get('if-none-match');
      const cachedEntry = apiCache.get(cacheKey);
      
      if (cachedEntry) {
        // 如果客户端ETag匹配，返回304
        if (ifNoneMatch && ifNoneMatch === cachedEntry.etag) {
          return new Response(null, { 
            status: 304,
            headers: {
              'etag': cachedEntry.etag,
              'cache-control': `max-age=${Math.floor((cachedEntry.ttl - (Date.now() - cachedEntry.timestamp)) / 1000)}`,
            }
          });
        }
        
        // 返回缓存的响应
        const response = new Response(JSON.stringify(cachedEntry.data), {
          status: cachedEntry.status,
          headers: {
            ...cachedEntry.headers,
            'content-type': 'application/json',
            'x-cache': 'HIT',
            'etag': cachedEntry.etag,
            'cache-control': `max-age=${Math.floor((cachedEntry.ttl - (Date.now() - cachedEntry.timestamp)) / 1000)}`,
          }
        });
        
        return response;
      }

      // 执行原始处理器
      try {
        const response = await handler(req, context);
        
        // 只缓存成功的响应
        if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
          const data = await response.clone().json();
          apiCache.set(cacheKey, response, data, options);
          
          // 添加缓存相关头部
          response.headers.set('x-cache', 'MISS');
          response.headers.set('etag', apiCache.generateETag(data));
        }
        
        return response;
      } catch (error) {
        throw error;
      }
    };
  };
}

/**
 * 缓存失效工具
 */
export const cacheInvalidator = {
  // 根据tag失效缓存
  invalidateByTags: (tags: string[]) => {
    apiCache.invalidateByTags(tags);
  },
  
  // 清除所有缓存
  clear: () => {
    apiCache.clear();
  },
  
  // 获取缓存统计
  getStats: () => {
    return apiCache.getStats();
  }
};

/**
 * 预设的缓存配置
 */
export const cachePresets = {
  // 短期缓存（1分钟）
  short: {
    ttl: 60 * 1000,
  },
  
  // 中期缓存（5分钟）
  medium: {
    ttl: 5 * 60 * 1000,
  },
  
  // 长期缓存（30分钟）
  long: {
    ttl: 30 * 60 * 1000,
  },
  
  // 用户相关数据缓存
  userData: {
    ttl: 2 * 60 * 1000, // 2分钟
    vary: ['authorization'],
    tags: ['user'],
  },
  
  // 婴儿数据缓存
  babyData: {
    ttl: 5 * 60 * 1000, // 5分钟
    vary: ['authorization'],
    tags: ['baby'],
  },
  
  // 静态内容缓存
  static: {
    ttl: 60 * 60 * 1000, // 1小时
    tags: ['static'],
  },
};

/**
 * 响应压缩工具
 */
export function compressResponse(data: unknown): string {
  // 简单的JSON压缩：移除不必要的空白
  return JSON.stringify(data);
}

/**
 * 缓存装饰器
 */
export function Cached(options: CacheOptions = {}) {
  return function(target: unknown, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    
    descriptor.value = withCache(options)(method);
    
    return descriptor;
  };
}

// 导出缓存实例用于测试
export { apiCache };