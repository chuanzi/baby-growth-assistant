import { RateLimitError } from './api-response';

/**
 * 内存中的简单限流实现
 * 生产环境建议使用 Redis 等外部存储
 */
class MemoryRateLimiter {
  private store = new Map<string, { count: number; resetTime: number }>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // 每分钟清理一次过期数据
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60 * 1000);
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, value] of this.store.entries()) {
      if (now > value.resetTime) {
        this.store.delete(key);
      }
    }
  }

  private getKey(identifier: string, action: string): string {
    return `${identifier}:${action}`;
  }

  /**
   * 检查是否触发限流
   */
  check(
    identifier: string,
    action: string,
    limit: number,
    windowMs: number
  ): { allowed: boolean; remaining: number; resetTime: number } {
    const key = this.getKey(identifier, action);
    const now = Date.now();
    const resetTime = now + windowMs;
    
    const current = this.store.get(key);
    
    if (!current || now > current.resetTime) {
      // 没有记录或已过期，重新开始计数
      this.store.set(key, { count: 1, resetTime });
      return {
        allowed: true,
        remaining: limit - 1,
        resetTime,
      };
    }
    
    if (current.count >= limit) {
      // 已超出限制
      return {
        allowed: false,
        remaining: 0,
        resetTime: current.resetTime,
      };
    }
    
    // 增加计数
    current.count++;
    this.store.set(key, current);
    
    return {
      allowed: true,
      remaining: limit - current.count,
      resetTime: current.resetTime,
    };
  }

  /**
   * 销毁定时器
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

// 全局限流器实例
const rateLimiter = new MemoryRateLimiter();

/**
 * 限流配置
 */
export interface RateLimitConfig {
  /** 时间窗口内允许的最大请求数 */
  max: number;
  /** 时间窗口长度（毫秒） */
  windowMs: number;
  /** 标识符提取函数（默认使用IP地址） */
  keyGenerator?: (request: Request) => string | Promise<string>;
  /** 跳过限流的条件函数 */
  skip?: (request: Request) => boolean | Promise<boolean>;
  /** 超出限制时的错误消息 */
  message?: string;
}

/**
 * 默认限流配置
 */
const defaultConfigs = {
  // 通用API限流：每分钟100次请求
  general: {
    max: 100,
    windowMs: 60 * 1000,
    message: '请求过于频繁，请稍后重试',
  },
  // 登录限流：每5分钟5次尝试
  login: {
    max: 5,
    windowMs: 5 * 60 * 1000,
    message: '登录尝试过于频繁，请稍后重试',
  },
  // 注册限流：每小时3次注册
  register: {
    max: 3,
    windowMs: 60 * 60 * 1000,
    message: '注册请求过于频繁，请稍后重试',
  },
  // 文件上传限流：每分钟5次上传
  upload: {
    max: 5,
    windowMs: 60 * 1000,
    message: '文件上传过于频繁，请稍后重试',
  },
  // 发送验证码限流：每分钟3次
  sendCode: {
    max: 3,
    windowMs: 60 * 1000,
    message: '验证码发送过于频繁，请稍后重试',
  },
};

/**
 * 获取客户端IP地址
 */
function getClientIP(request: Request): string {
  // 尝试从各种头部获取真实IP
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  
  if (forwarded) {
    // x-forwarded-for 可能包含多个IP，取第一个
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  if (cfConnectingIP) {
    return cfConnectingIP;
  }
  
  // 如果都没有，返回默认值
  return 'unknown';
}

/**
 * 应用限流中间件
 */
export async function applyRateLimit(
  request: Request,
  action: string,
  config: RateLimitConfig
): Promise<void> {
  // 检查是否跳过限流
  if (config.skip && await config.skip(request)) {
    return;
  }

  // 获取标识符
  const identifier = config.keyGenerator 
    ? await config.keyGenerator(request)
    : getClientIP(request);

  // 检查限流
  const result = rateLimiter.check(
    identifier,
    action,
    config.max,
    config.windowMs
  );

  if (!result.allowed) {
    const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);
    throw new RateLimitError(
      config.message || '请求过于频繁，请稍后重试',
      retryAfter
    );
  }

  // 可以在响应头中添加限流信息
  // 这里不直接操作响应，而是将信息存储在请求对象中，由调用方处理
  (request as Request & {
    rateLimitInfo?: {
      remaining: number;
      resetTime: number;
    }
  }).rateLimitInfo = {
    remaining: result.remaining,
    resetTime: result.resetTime,
  };
}

/**
 * 预定义的限流装饰器
 */
export const RateLimits = {
  /**
   * 通用API限流
   */
  general: (config?: Partial<RateLimitConfig>) => 
    (request: Request) => applyRateLimit(request, 'general', { ...defaultConfigs.general, ...config }),

  /**
   * 登录限流
   */
  login: (config?: Partial<RateLimitConfig>) => 
    (request: Request) => applyRateLimit(request, 'login', { ...defaultConfigs.login, ...config }),

  /**
   * 注册限流
   */
  register: (config?: Partial<RateLimitConfig>) => 
    (request: Request) => applyRateLimit(request, 'register', { ...defaultConfigs.register, ...config }),

  /**
   * 文件上传限流
   */
  upload: (config?: Partial<RateLimitConfig>) => 
    (request: Request) => applyRateLimit(request, 'upload', { ...defaultConfigs.upload, ...config }),

  /**
   * 发送验证码限流
   */
  sendCode: (config?: Partial<RateLimitConfig>) => 
    (request: Request) => applyRateLimit(request, 'sendCode', { ...defaultConfigs.sendCode, ...config }),

  /**
   * 自定义限流
   */
  custom: (action: string, config: RateLimitConfig) => 
    (request: Request) => applyRateLimit(request, action, config),
};

/**
 * 限流装饰器函数
 * 用于包装API路由处理函数
 */
export function withRateLimit<T extends unknown[]>(
  rateLimitFn: (request: Request) => Promise<void>,
  handler: (request: Request, ...args: T) => Promise<Response>
) {
  return async (request: Request, ...args: T): Promise<Response> => {
    await rateLimitFn(request);
    return await handler(request, ...args);
  };
}

/**
 * 基于用户ID的限流
 * 需要在认证之后使用
 */
export function createUserRateLimit(
  action: string,
  config: Omit<RateLimitConfig, 'keyGenerator'>
): (request: Request & { userId?: string }) => Promise<void> {
  return async (request: Request & { userId?: string }) => {
    const userId = request.userId || getClientIP(request);
    await applyRateLimit(request, action, {
      ...config,
      keyGenerator: () => `user:${userId}`,
    });
  };
}

/**
 * 清理函数（用于测试或应用关闭时）
 */
export function cleanup() {
  rateLimiter.destroy();
}

// 导出默认配置供外部使用
export { defaultConfigs };