'use client';

interface RequestConfig {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  cache?: boolean;
  compress?: boolean;
  priority?: 'high' | 'low' | 'auto';
}

interface NetworkQuality {
  effectiveType: string;
  downlink: number;
  rtt: number;
  saveData: boolean;
}

/**
 * 网络传输优化工具类
 */
export class NetworkOptimizer {
  private requestQueue: Array<{ request: () => Promise<Response>; priority: number }> = [];
  private processing = false;
  private networkQuality: NetworkQuality | null = null;

  constructor() {
    this.initNetworkMonitoring();
  }

  private initNetworkMonitoring() {
    if (typeof navigator !== 'undefined' && 'connection' in navigator) {
      const connection = (navigator as Navigator & {
        connection?: {
          effectiveType?: string;
          downlink?: number;
          rtt?: number;
          saveData?: boolean;
          addEventListener: (event: string, handler: () => void) => void;
        }
      }).connection;
      
      const updateNetworkInfo = () => {
        this.networkQuality = {
          effectiveType: connection.effectiveType || '4g',
          downlink: connection.downlink || 10,
          rtt: connection.rtt || 100,
          saveData: connection.saveData || false,
        };
      };

      updateNetworkInfo();
      connection.addEventListener('change', updateNetworkInfo);
    }
  }

  /**
   * 获取网络质量
   */
  getNetworkQuality(): 'good' | 'poor' | 'offline' {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return 'offline';
    }

    if (!this.networkQuality) return 'good';

    const { effectiveType, downlink, rtt } = this.networkQuality;
    
    if (effectiveType === 'slow-2g' || downlink < 0.5 || rtt > 1000) {
      return 'poor';
    }

    if (effectiveType === '4g' && downlink > 1.5 && rtt < 300) {
      return 'good';
    }

    return 'good';
  }

  /**
   * 智能请求配置
   */
  getOptimalRequestConfig(): RequestConfig {
    const quality = this.getNetworkQuality();
    const saveData = this.networkQuality?.saveData || false;

    switch (quality) {
      case 'poor':
        return {
          timeout: 15000,
          retries: 3,
          retryDelay: 2000,
          cache: true,
          compress: true,
          priority: 'high',
        };
      case 'offline':
        return {
          timeout: 5000,
          retries: 0,
          cache: true,
          compress: true,
          priority: 'high',
        };
      default:
        return {
          timeout: saveData ? 8000 : 5000,
          retries: saveData ? 2 : 1,
          retryDelay: 1000,
          cache: saveData,
          compress: saveData,
          priority: 'auto',
        };
    }
  }

  /**
   * 优化的fetch函数
   */
  async optimizedFetch(url: string, options: RequestInit & RequestConfig = {}): Promise<Response> {
    const config = { ...this.getOptimalRequestConfig(), ...options };
    const { timeout, retries = 1, retryDelay = 1000, ...fetchOptions } = config;

    // 添加压缩支持
    if (config.compress && !fetchOptions.headers) {
      fetchOptions.headers = {};
    }
    if (config.compress && fetchOptions.headers) {
      (fetchOptions.headers as Record<string, string>)['Accept-Encoding'] = 'gzip, deflate, br';
    }

    // 添加缓存控制
    if (config.cache && fetchOptions.method === 'GET') {
      (fetchOptions.headers as Record<string, string>)['Cache-Control'] = 'max-age=300, stale-while-revalidate=60';
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          ...fetchOptions,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return response;
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < retries && !this.isNonRetryableError(error)) {
          await this.delay(retryDelay * Math.pow(2, attempt)); // 指数退避
          continue;
        }
        
        break;
      }
    }

    throw lastError;
  }

  private isNonRetryableError(error: unknown): boolean {
    return (
      error.name === 'AbortError' ||
      (error.message && error.message.includes('401')) ||
      (error.message && error.message.includes('403'))
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 请求队列管理
   */
  async queueRequest<T>(
    request: () => Promise<T>, 
    priority: 'high' | 'normal' | 'low' = 'normal'
  ): Promise<T> {
    const priorityValue = { high: 3, normal: 2, low: 1 }[priority];
    
    return new Promise((resolve, reject) => {
      this.requestQueue.push({
        request: async () => {
          try {
            const result = await request();
            resolve(result);
          } catch (error) {
            reject(error);
          }
        },
        priority: priorityValue,
      });

      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.processing || this.requestQueue.length === 0) return;

    this.processing = true;

    // 按优先级排序
    this.requestQueue.sort((a, b) => b.priority - a.priority);

    const quality = this.getNetworkQuality();
    const concurrency = quality === 'poor' ? 1 : quality === 'good' ? 4 : 2;

    while (this.requestQueue.length > 0) {
      const batch = this.requestQueue.splice(0, concurrency);
      
      try {
        await Promise.all(batch.map(item => item.request()));
      } catch (error) {
        console.error('[Network] Batch request error:', error);
      }

      // 在慢网络下添加延迟
      if (quality === 'poor') {
        await this.delay(100);
      }
    }

    this.processing = false;
  }
}

// 全局网络优化器实例
const networkOptimizer = new NetworkOptimizer();

/**
 * 优化的API客户端
 */
export class OptimizedAPIClient {
  private baseURL: string;
  private defaultHeaders: Record<string, string>;

  constructor(baseURL: string = '', defaultHeaders: Record<string, string> = {}) {
    this.baseURL = baseURL;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...defaultHeaders,
    };
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit & RequestConfig = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const headers = { ...this.defaultHeaders, ...(options.headers || {}) };

    const response = await networkOptimizer.optimizedFetch(url, {
      ...options,
      headers,
    });

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return response.json();
    }

    return response.text() as Promise<string>;
  }

  async get<T>(endpoint: string, options?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  async post<T>(endpoint: string, data?: unknown, options?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: unknown, options?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string, options?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  /**
   * 批量请求
   */
  async batch<T>(requests: Array<{ endpoint: string; options?: RequestConfig }>): Promise<T[]> {
    const quality = networkOptimizer.getNetworkQuality();
    const batchSize = quality === 'poor' ? 2 : quality === 'good' ? 6 : 4;

    const results: T[] = [];
    
    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize);
      
      const batchPromises = batch.map(({ endpoint, options }) =>
        networkOptimizer.queueRequest(() => this.get<T>(endpoint, options), 'normal')
      );

      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          console.error('[API] Batch request failed:', result.reason);
          results.push(null as T);
        }
      });
    }

    return results;
  }
}

/**
 * 资源预加载管理器
 */
export class ResourcePreloader {
  private preloadedResources = new Set<string>();

  /**
   * 预加载关键资源
   */
  preloadCriticalResources(resources: Array<{ url: string; type: 'script' | 'style' | 'image' | 'font' }>) {
    const quality = networkOptimizer.getNetworkQuality();
    
    // 在慢网络下只预加载最关键的资源
    if (quality === 'poor') {
      resources = resources.filter(r => r.type === 'style' || r.type === 'font');
    }

    resources.forEach(({ url, type }) => {
      if (this.preloadedResources.has(url)) return;

      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = url;

      switch (type) {
        case 'script':
          link.as = 'script';
          break;
        case 'style':
          link.as = 'style';
          break;
        case 'image':
          link.as = 'image';
          break;
        case 'font':
          link.as = 'font';
          link.crossOrigin = 'anonymous';
          break;
      }

      document.head.appendChild(link);
      this.preloadedResources.add(url);
    });
  }

  /**
   * 预连接到域名
   */
  preconnectToDomains(domains: string[]) {
    domains.forEach(domain => {
      if (this.preloadedResources.has(domain)) return;

      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = domain;
      link.crossOrigin = 'anonymous';

      document.head.appendChild(link);
      this.preloadedResources.add(domain);
    });
  }

  /**
   * DNS预解析
   */
  prefetchDNS(domains: string[]) {
    domains.forEach(domain => {
      if (this.preloadedResources.has(`dns:${domain}`)) return;

      const link = document.createElement('link');
      link.rel = 'dns-prefetch';
      link.href = domain;

      document.head.appendChild(link);
      this.preloadedResources.add(`dns:${domain}`);
    });
  }
}

// 导出实例
export const apiClient = new OptimizedAPIClient('/api');
export const resourcePreloader = new ResourcePreloader();
export { networkOptimizer };

/**
 * 网络优化Hook
 */
export function useNetworkOptimization() {
  return {
    networkOptimizer,
    apiClient,
    resourcePreloader,
    getNetworkQuality: () => networkOptimizer.getNetworkQuality(),
    queueRequest: <T>(request: () => Promise<T>, priority?: 'high' | 'normal' | 'low') =>
      networkOptimizer.queueRequest(request, priority),
  };
}

/**
 * 图片优化配置
 */
export const getOptimizedImageUrl = (src: string, options: {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'avif' | 'auto';
} = {}) => {
  const quality = networkOptimizer.getNetworkQuality();
  const saveData = (navigator as Navigator & {
    connection?: { saveData?: boolean }
  }).connection?.saveData || false;

  const { 
    width,
    height,
    quality: imageQuality = saveData || quality === 'poor' ? 60 : 80,
    format = 'auto'
  } = options;

  // 如果是本地图片或已经优化的图片，直接返回
  if (src.startsWith('data:') || src.startsWith('/icons/') || src.includes('optimized')) {
    return src;
  }

  // 构建优化URL（假设使用Next.js Image Optimization或CDN）
  const params = new URLSearchParams();
  if (width) params.set('w', width.toString());
  if (height) params.set('h', height.toString());
  params.set('q', imageQuality.toString());
  if (format !== 'auto') params.set('f', format);

  return `/_next/image?url=${encodeURIComponent(src)}&${params.toString()}`;
};