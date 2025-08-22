'use client';

import { useEffect, useCallback, useRef } from 'react';

interface PerformanceMetrics {
  fcp?: number; // First Contentful Paint
  lcp?: number; // Largest Contentful Paint
  fid?: number; // First Input Delay
  cls?: number; // Cumulative Layout Shift
  ttfb?: number; // Time to First Byte
  memoryUsage?: {
    usedJSSize: number;
    totalJSSize: number;
    jsLimitSize: number;
  };
}

interface PerformanceConfig {
  enableCoreWebVitals?: boolean;
  enableMemoryMonitoring?: boolean;
  enableCustomMetrics?: boolean;
  reportingEndpoint?: string;
  reportingInterval?: number;
  enableConsoleLogging?: boolean;
}

/**
 * 性能监控Hook
 * 监控Core Web Vitals和自定义性能指标
 */
export function usePerformanceMonitor(config: PerformanceConfig = {}) {
  const {
    enableCoreWebVitals = true,
    enableMemoryMonitoring = true,
    enableCustomMetrics = true,
    reportingEndpoint,
    reportingInterval = 30000, // 30秒
    enableConsoleLogging = process.env.NODE_ENV === 'development',
  } = config;

  const metricsRef = useRef<PerformanceMetrics>({});
  const reportingTimerRef = useRef<NodeJS.Timeout>();

  // 记录性能指标
  const recordMetric = useCallback((name: keyof PerformanceMetrics, value: number) => {
    metricsRef.current[name] = value;
    
    if (enableConsoleLogging) {
      console.log(`[Performance] ${name}: ${value}ms`);
    }
  }, [enableConsoleLogging]);

  // 获取内存使用情况
  const getMemoryUsage = useCallback(() => {
    if ('memory' in performance) {
      const memory = (performance as Performance & { memory: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
      return {
        usedJSSize: Math.round(memory.usedJSHeapSize / 1048576 * 100) / 100, // MB
        totalJSSize: Math.round(memory.totalJSHeapSize / 1048576 * 100) / 100, // MB
        jsLimitSize: Math.round(memory.jsHeapSizeLimit / 1048576 * 100) / 100, // MB
      };
    }
    return null;
  }, []);

  // 监控Core Web Vitals
  useEffect(() => {
    if (!enableCoreWebVitals || typeof window === 'undefined') return;

    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        switch (entry.entryType) {
          case 'paint':
            if (entry.name === 'first-contentful-paint') {
              recordMetric('fcp', entry.startTime);
            }
            break;
          case 'largest-contentful-paint':
            recordMetric('lcp', entry.startTime);
            break;
          case 'first-input':
            recordMetric('fid', (entry as PerformanceEventTiming).processingStart - entry.startTime);
            break;
          case 'layout-shift': {
            const layoutShiftEntry = entry as PerformanceEntry & { hadRecentInput: boolean; value: number };
            if (!layoutShiftEntry.hadRecentInput) {
              const cls = metricsRef.current.cls || 0;
              recordMetric('cls', cls + layoutShiftEntry.value);
            }
          }
            break;
          case 'navigation':
            const navigationEntry = entry as PerformanceNavigationTiming;
            recordMetric('ttfb', navigationEntry.responseStart - navigationEntry.requestStart);
            break;
        }
      });
    });

    // 监听各种性能事件
    const supportedEntryTypes = [
      'paint',
      'largest-contentful-paint',
      'first-input',
      'layout-shift',
      'navigation',
    ];

    supportedEntryTypes.forEach((type) => {
      try {
        observer.observe({ type, buffered: true });
      } catch (e) {
        // 某些浏览器可能不支持特定的性能指标
        if (enableConsoleLogging) {
          console.warn(`[Performance] ${type} not supported`);
        }
      }
    });

    return () => observer.disconnect();
  }, [enableCoreWebVitals, recordMetric, enableConsoleLogging]);

  // 监控内存使用
  useEffect(() => {
    if (!enableMemoryMonitoring || typeof window === 'undefined') return;

    const monitorMemory = () => {
      const memoryUsage = getMemoryUsage();
      if (memoryUsage) {
        metricsRef.current.memoryUsage = memoryUsage;
        
        if (enableConsoleLogging) {
          console.log('[Performance] Memory Usage:', memoryUsage);
        }

        // 内存使用警告
        const usagePercentage = (memoryUsage.usedJSSize / memoryUsage.jsLimitSize) * 100;
        if (usagePercentage > 80) {
          console.warn(`[Performance] High memory usage: ${usagePercentage.toFixed(2)}%`);
        }
      }
    };

    const interval = setInterval(monitorMemory, 10000); // 每10秒检查一次
    monitorMemory(); // 立即执行一次

    return () => clearInterval(interval);
  }, [enableMemoryMonitoring, getMemoryUsage, enableConsoleLogging]);

  // 自动上报性能数据
  useEffect(() => {
    if (!reportingEndpoint) return;

    const reportMetrics = async () => {
      const metrics = { ...metricsRef.current };
      
      try {
        await fetch(reportingEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            timestamp: Date.now(),
            url: window.location.href,
            userAgent: navigator.userAgent,
            metrics,
          }),
        });
      } catch (error) {
        if (enableConsoleLogging) {
          console.error('[Performance] Failed to report metrics:', error);
        }
      }
    };

    reportingTimerRef.current = setInterval(reportMetrics, reportingInterval);

    // 页面卸载时也上报一次
    const handleBeforeUnload = () => {
      if (navigator.sendBeacon && reportingEndpoint) {
        const metrics = { ...metricsRef.current };
        navigator.sendBeacon(
          reportingEndpoint,
          JSON.stringify({
            timestamp: Date.now(),
            url: window.location.href,
            metrics,
          })
        );
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      if (reportingTimerRef.current) {
        clearInterval(reportingTimerRef.current);
      }
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [reportingEndpoint, reportingInterval, enableConsoleLogging]);

  // 手动记录自定义指标
  const recordCustomMetric = useCallback((name: string, value: number, unit = 'ms') => {
    if (!enableCustomMetrics) return;
    
    if (enableConsoleLogging) {
      console.log(`[Performance] Custom Metric - ${name}: ${value}${unit}`);
    }

    // 可以扩展为上报到外部监控服务
    if (reportingEndpoint) {
      fetch(reportingEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'custom-metric',
          timestamp: Date.now(),
          name,
          value,
          unit,
          url: window.location.href,
        }),
      }).catch(() => {
        // 静默处理错误
      });
    }
  }, [enableCustomMetrics, enableConsoleLogging, reportingEndpoint]);

  // 性能时间测量工具
  const measurePerformance = useCallback((label: string) => {
    const startTime = performance.now();
    
    return {
      end: () => {
        const duration = performance.now() - startTime;
        recordCustomMetric(label, duration);
        return duration;
      }
    };
  }, [recordCustomMetric]);

  // 获取当前性能指标
  const getCurrentMetrics = useCallback((): PerformanceMetrics => {
    return { ...metricsRef.current };
  }, []);

  // 性能预算检查
  const checkPerformanceBudget = useCallback((budget: Partial<PerformanceMetrics>) => {
    const current = metricsRef.current;
    const violations: string[] = [];

    Object.entries(budget).forEach(([key, limit]) => {
      const currentValue = current[key as keyof PerformanceMetrics];
      if (typeof currentValue === 'number' && currentValue > limit) {
        violations.push(`${key}: ${currentValue}ms > ${limit}ms`);
      }
    });

    if (violations.length > 0 && enableConsoleLogging) {
      console.warn('[Performance] Budget violations:', violations);
    }

    return violations;
  }, [enableConsoleLogging]);

  return {
    recordCustomMetric,
    measurePerformance,
    getCurrentMetrics,
    checkPerformanceBudget,
    getMemoryUsage,
  };
}

/**
 * 性能监控高阶组件
 */
export function withPerformanceMonitoring<P = Record<string, unknown>>(
  Component: React.ComponentType<P>,
  componentName?: string
) {
  return function PerformanceMonitoredComponent(props: P) {
    const { measurePerformance } = usePerformanceMonitor();

    useEffect(() => {
      const measure = measurePerformance(`${componentName || Component.name || 'Component'} render`);
      return () => measure.end();
    }, [measurePerformance]);

    return <Component {...props} />;
  };
}