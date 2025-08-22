'use client';

import { useEffect, useRef, useCallback, useMemo } from 'react';
import { usePerformanceMonitor } from './usePerformanceMonitor';

interface MemoryOptimizationConfig {
  enableMemoryTracking?: boolean;
  memoryThreshold?: number; // MB
  cleanupInterval?: number; // ms
  enableWeakRef?: boolean;
  enableImageOptimization?: boolean;
}

/**
 * 内存优化Hook
 * 提供内存监控、清理和优化功能
 */
export function useMemoryOptimization(config: MemoryOptimizationConfig = {}) {
  const {
    enableMemoryTracking = true,
    memoryThreshold = 100, // 100MB
    cleanupInterval = 30000, // 30秒
    enableWeakRef = true,
    enableImageOptimization = true,
  } = config;

  const { getMemoryUsage } = usePerformanceMonitor();
  const cleanupFunctionsRef = useRef<Set<() => void>>(new Set());
  const weakRefsRef = useRef<Set<WeakRef<unknown>>>(new Set());
  const observersRef = useRef<Set<ResizeObserver | IntersectionObserver | MutationObserver>>(new Set());
  const timersRef = useRef<Set<NodeJS.Timeout>>(new Set());
  const imageRefsRef = useRef<Set<HTMLImageElement>>(new Set());

  // 注册清理函数
  const registerCleanup = useCallback((cleanupFn: () => void) => {
    cleanupFunctionsRef.current.add(cleanupFn);
    
    return () => {
      cleanupFunctionsRef.current.delete(cleanupFn);
    };
  }, []);

  // 注册WeakRef
  const registerWeakRef = useCallback(<T extends object>(obj: T): WeakRef<T> | T => {
    if (!enableWeakRef || typeof WeakRef === 'undefined') {
      return obj;
    }

    const weakRef = new WeakRef(obj);
    weakRefsRef.current.add(weakRef as WeakRef<unknown>);
    
    return weakRef;
  }, [enableWeakRef]);

  // 注册Observer
  const registerObserver = useCallback(<T extends ResizeObserver | IntersectionObserver | MutationObserver>(observer: T): T => {
    observersRef.current.add(observer);
    
    return observer;
  }, []);

  // 注册定时器
  const registerTimer = useCallback((timer: NodeJS.Timeout): NodeJS.Timeout => {
    timersRef.current.add(timer);
    
    return timer;
  }, []);

  // 注册图片元素
  const registerImage = useCallback((img: HTMLImageElement): HTMLImageElement => {
    if (enableImageOptimization) {
      imageRefsRef.current.add(img);
    }
    
    return img;
  }, [enableImageOptimization]);

  // 清理过期的WeakRef
  const cleanupWeakRefs = useCallback(() => {
    const aliveRefs = new Set<WeakRef<unknown>>();
    
    for (const weakRef of weakRefsRef.current) {
      if (weakRef.deref()) {
        aliveRefs.add(weakRef);
      }
    }
    
    weakRefsRef.current = aliveRefs;
  }, []);

  // 清理不可见的图片
  const cleanupImages = useCallback(() => {
    if (!enableImageOptimization) return;

    const visibleImages = new Set<HTMLImageElement>();
    
    for (const img of imageRefsRef.current) {
      if (img.isConnected && isElementVisible(img)) {
        visibleImages.add(img);
      } else if (!img.isConnected) {
        // 清理已删除的图片引用
        continue;
      } else {
        // 清理不可见图片的src以释放内存
        if (img.dataset.originalSrc && img.src !== img.dataset.originalSrc) {
          img.dataset.originalSrc = img.src;
          img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'; // 1x1透明gif
        }
      }
    }
    
    imageRefsRef.current = visibleImages;
  }, [enableImageOptimization]);

  // 检查元素是否可见
  const isElementVisible = useCallback((element: HTMLElement): boolean => {
    const rect = element.getBoundingClientRect();
    return (
      rect.width > 0 && 
      rect.height > 0 &&
      rect.bottom >= 0 &&
      rect.right >= 0 &&
      rect.top <= window.innerHeight &&
      rect.left <= window.innerWidth
    );
  }, []);

  // 内存监控和清理
  const performMemoryCleanup = useCallback(async () => {
    if (!enableMemoryTracking) return;

    const memoryInfo = getMemoryUsage();
    if (!memoryInfo) return;

    const currentMemoryMB = memoryInfo.usedJSSize;
    
    if (currentMemoryMB > memoryThreshold) {
      console.warn(`[Memory] High memory usage detected: ${currentMemoryMB.toFixed(2)}MB`);
      
      // 执行清理函数
      cleanupFunctionsRef.current.forEach(cleanup => {
        try {
          cleanup();
        } catch (error) {
          console.error('[Memory] Cleanup function error:', error);
        }
      });
      
      // 清理WeakRef
      cleanupWeakRefs();
      
      // 清理图片
      cleanupImages();
      
      // 建议垃圾回收（如果可用）
      if ('gc' in window && typeof (window as Window & { gc?: () => void }).gc === 'function') {
        (window as Window & { gc?: () => void }).gc();
      }
    }
  }, [enableMemoryTracking, memoryThreshold, getMemoryUsage, cleanupWeakRefs, cleanupImages]);

  // 定期内存清理
  useEffect(() => {
    if (!enableMemoryTracking) return;

    const interval = setInterval(performMemoryCleanup, cleanupInterval);
    timersRef.current.add(interval);

    return () => {
      clearInterval(interval);
      timersRef.current.delete(interval);
    };
  }, [enableMemoryTracking, cleanupInterval, performMemoryCleanup]);

  // 组件卸载时的清理
  useEffect(() => {
    return () => {
      // 清理所有注册的清理函数
      cleanupFunctionsRef.current.forEach(cleanup => {
        try {
          cleanup();
        } catch (error) {
          console.error('[Memory] Cleanup error during unmount:', error);
        }
      });

      // 清理所有Observer
      observersRef.current.forEach(observer => {
        try {
          observer.disconnect();
        } catch (error) {
          console.error('[Memory] Observer disconnect error:', error);
        }
      });

      // 清理所有定时器
      timersRef.current.forEach(timer => {
        try {
          clearTimeout(timer);
          clearInterval(timer);
        } catch (error) {
          console.error('[Memory] Timer cleanup error:', error);
        }
      });

      // 清理图片引用
      imageRefsRef.current.clear();
      
      // 清理WeakRef
      weakRefsRef.current.clear();
    };
  }, []);

  return {
    registerCleanup,
    registerWeakRef,
    registerObserver,
    registerTimer,
    registerImage,
    performMemoryCleanup,
    cleanupWeakRefs,
    isElementVisible,
  };
}

/**
 * 图片懒加载和内存优化Hook
 */
export function useImageOptimization() {
  const { registerImage, registerObserver, registerCleanup, isElementVisible } = useMemoryOptimization();
  const imageRefsRef = useRef<Map<HTMLImageElement, string>>(new Map());

  const createOptimizedImage = useCallback((src: string, options: {
    lazy?: boolean;
    placeholder?: string;
    sizes?: string;
    quality?: number;
  } = {}) => {
    const {
      lazy = true,
      placeholder = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      sizes,
      quality = 75,
    } = options;

    const img = new Image();
    registerImage(img);
    
    // 设置占位符
    if (lazy && placeholder) {
      img.src = placeholder;
      img.dataset.originalSrc = src;
    } else {
      img.src = src;
    }

    if (sizes) {
      img.sizes = sizes;
    }

    // 添加加载监听
    const handleLoad = () => {
      img.removeEventListener('load', handleLoad);
      img.removeEventListener('error', handleError);
    };

    const handleError = () => {
      img.removeEventListener('load', handleLoad);
      img.removeEventListener('error', handleError);
      console.warn('[Image] Failed to load:', src);
    };

    img.addEventListener('load', handleLoad);
    img.addEventListener('error', handleError);

    // 注册清理
    registerCleanup(() => {
      img.removeEventListener('load', handleLoad);
      img.removeEventListener('error', handleError);
    });

    return img;
  }, [registerImage, registerCleanup]);

  const createIntersectionObserver = useCallback((callback: IntersectionObserverCallback, options?: IntersectionObserverInit) => {
    const observer = new IntersectionObserver(callback, {
      rootMargin: '50px',
      threshold: 0.1,
      ...options,
    });

    return registerObserver(observer);
  }, [registerObserver]);

  return {
    createOptimizedImage,
    createIntersectionObserver,
  };
}

/**
 * 大列表数据内存优化Hook
 */
export function useListDataOptimization<T>(data: T[], pageSize = 50) {
  const { registerWeakRef, registerCleanup } = useMemoryOptimization();
  const cacheRef = useRef<Map<number, WeakRef<T[]>>>(new Map());

  const getPageData = useCallback((page: number): T[] => {
    const cacheKey = page;
    const cached = cacheRef.current.get(cacheKey);
    
    if (cached) {
      const cachedData = cached.deref();
      if (cachedData) {
        return cachedData;
      } else {
        cacheRef.current.delete(cacheKey);
      }
    }

    const start = page * pageSize;
    const end = start + pageSize;
    const pageData = data.slice(start, end);
    
    // 使用WeakRef缓存
    const weakRef = registerWeakRef(pageData) as WeakRef<T[]>;
    if (weakRef instanceof WeakRef) {
      cacheRef.current.set(cacheKey, weakRef);
    }

    return pageData;
  }, [data, pageSize, registerWeakRef]);

  const clearCache = useCallback(() => {
    cacheRef.current.clear();
  }, []);

  // 注册清理函数
  useEffect(() => {
    return registerCleanup(clearCache);
  }, [registerCleanup, clearCache]);

  const totalPages = useMemo(() => Math.ceil(data.length / pageSize), [data.length, pageSize]);

  return {
    getPageData,
    totalPages,
    clearCache,
  };
}

/**
 * 组件内存监控装饰器
 */
export function withMemoryMonitoring<P = Record<string, unknown>>(Component: React.ComponentType<P>, componentName?: string) {
  return function MemoryMonitoredComponent(props: P) {
    const { registerCleanup } = useMemoryOptimization();

    useEffect(() => {
      const name = componentName || Component.name || 'Component';
      console.log(`[Memory] ${name} mounted`);

      return registerCleanup(() => {
        console.log(`[Memory] ${name} cleanup`);
      });
    }, [registerCleanup]);

    return <Component {...props} />;
  };
}