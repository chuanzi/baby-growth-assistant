import { PrismaClient } from '@prisma/client'
import { demoDb } from './demo-db'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// 检查是否在Vercel环境中且数据库URL使用临时文件
const isVercelDemo = process.env.VERCEL && process.env.DATABASE_URL?.includes('/tmp/')

export const prisma = isVercelDemo 
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ? (demoDb as any) // 在Vercel演示环境中使用内存数据库
  : (globalForPrisma.prisma ??
    new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn'] : ['error'],
      datasources: {
        db: {
          url: process.env.DATABASE_URL
        }
      },
      // 基础配置，移除不支持的性能配置选项
    }))

// 性能优化的查询扩展
export const optimizedPrisma = prisma.$extends({
  query: {
    $allModels: {
      async findMany({ model, operation, args, query }) {
        // 自动添加分页限制，防止大量数据查询
        if (!args?.take && !args?.cursor) {
          args = { ...args, take: 100 };
        }
        
        // 记录查询时间
        const start = Date.now();
        const result = await query(args);
        const duration = Date.now() - start;
        
        if (process.env.NODE_ENV === 'development' && duration > 100) {
          console.warn(`[Prisma] Slow query detected: ${model}.${operation} took ${duration}ms`);
        }
        
        return result;
      },
      async findFirst({ model, operation, args, query }) {
        const start = Date.now();
        const result = await query(args);
        const duration = Date.now() - start;
        
        if (process.env.NODE_ENV === 'development' && duration > 50) {
          console.warn(`[Prisma] Slow query detected: ${model}.${operation} took ${duration}ms`);
        }
        
        return result;
      }
    }
  }
});

// 查询缓存工具
const queryCache = new Map<string, { data: unknown; timestamp: number; ttl: number }>();

export function createCachedQuery<T>(
  queryFn: () => Promise<T>, 
  cacheKey: string, 
  ttlMs: number = 5 * 60 * 1000 // 5分钟默认TTL
): Promise<T> {
  const cached = queryCache.get(cacheKey);
  const now = Date.now();
  
  if (cached && (now - cached.timestamp) < cached.ttl) {
    return Promise.resolve(cached.data);
  }
  
  return queryFn().then(data => {
    queryCache.set(cacheKey, {
      data,
      timestamp: now,
      ttl: ttlMs
    });
    return data;
  });
}

// 批量查询优化
export class BatchLoader<K, V> {
  private batch: Array<{ key: K; resolve: (value: V | null) => void; reject: (error: unknown) => void }> = [];
  private timer: NodeJS.Timeout | null = null;
  
  constructor(
    private loadFn: (keys: K[]) => Promise<V[]>,
    private maxBatchSize = 50,
    private batchTimeoutMs = 10
  ) {}
  
  load(key: K): Promise<V | null> {
    return new Promise((resolve, reject) => {
      this.batch.push({ key, resolve, reject });
      
      if (this.batch.length >= this.maxBatchSize) {
        this.processBatch();
      } else if (!this.timer) {
        this.timer = setTimeout(() => this.processBatch(), this.batchTimeoutMs);
      }
    });
  }
  
  private async processBatch() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    
    const currentBatch = this.batch.splice(0, this.maxBatchSize);
    if (currentBatch.length === 0) return;
    
    try {
      const keys = currentBatch.map(item => item.key);
      const results = await this.loadFn(keys);
      
      currentBatch.forEach((item, index) => {
        item.resolve(results[index] || null);
      });
    } catch (error) {
      currentBatch.forEach(item => item.reject(error));
    }
  }
}

// 清理过期缓存
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of queryCache.entries()) {
    if ((now - value.timestamp) >= value.ttl) {
      queryCache.delete(key);
    }
  }
}, 10 * 60 * 1000); // 每10分钟清理一次

if (process.env.NODE_ENV !== 'production' && !isVercelDemo) {
  globalForPrisma.prisma = prisma as PrismaClient
}