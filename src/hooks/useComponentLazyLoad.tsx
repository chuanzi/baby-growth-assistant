'use client';

import { useState, useEffect, useRef, useMemo } from 'react';

interface LazyLoadOptions {
  rootMargin?: string;
  threshold?: number | number[];
  triggerOnce?: boolean;
  fallback?: React.ComponentType;
  delay?: number;
}

/**
 * 性能优化的组件懒加载Hook
 * 用于实现组件级别的懒加载，减少初始包大小
 */
export function useComponentLazyLoad<T = Record<string, unknown>>(
  importFunction: () => Promise<{ default: React.ComponentType<T> }>,
  options: LazyLoadOptions = {}
) {
  const {
    rootMargin = '50px',
    threshold = 0.1,
    triggerOnce = true,
    fallback: Fallback,
    delay = 0,
  } = options;

  const [Component, setComponent] = useState<React.ComponentType<T> | null>(null);
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const elementRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // 创建Intersection Observer
  useEffect(() => {
    if (!elementRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          setIsIntersecting(true);
          if (triggerOnce && observerRef.current) {
            observerRef.current.disconnect();
          }
        }
      },
      {
        rootMargin,
        threshold,
      }
    );

    observer.observe(elementRef.current);
    observerRef.current = observer;

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [rootMargin, threshold, triggerOnce]);

  // 懒加载组件
  useEffect(() => {
    if (!isIntersecting || Component || isLoading) return;

    setIsLoading(true);
    setError(null);

    const loadComponent = async () => {
      try {
        // 添加可选的延迟
        if (delay > 0) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        const importedModule = await importFunction();
        setComponent(() => importedModule.default);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load component'));
      } finally {
        setIsLoading(false);
      }
    };

    loadComponent();
  }, [isIntersecting, Component, isLoading, importFunction, delay]);

  // 清理函数
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  const LazyComponent = useMemo(() => {
    if (error) {
      return function ErrorComponent(props: T) {
        return (
          <div className="p-4 text-center text-red-600">
            <p>组件加载失败</p>
            <button
              onClick={() => {
                setError(null);
                setIsIntersecting(true);
              }}
              className="mt-2 px-3 py-1 text-sm bg-red-100 rounded hover:bg-red-200"
            >
              重试
            </button>
          </div>
        );
      };
    }

    if (Component) {
      return Component;
    }

    if (isLoading && Fallback) {
      return Fallback;
    }

    if (isLoading) {
      return function LoadingComponent() {
        return (
          <div className="flex items-center justify-center p-4">
            <div className="loading-skeleton w-full h-20 rounded"></div>
          </div>
        );
      };
    }

    // 返回占位组件
    return function PlaceholderComponent() {
      return <div ref={elementRef} className="min-h-[1px]" />;
    };
  }, [Component, isLoading, error, Fallback]);

  return {
    Component: LazyComponent,
    isLoading,
    error,
    elementRef,
  };
}

/**
 * 高阶组件懒加载包装器
 */
export function withLazyLoad<P = Record<string, unknown>>(
  importFunction: () => Promise<{ default: React.ComponentType<P> }>,
  options?: LazyLoadOptions
) {
  return function LazyWrapper(props: P) {
    const { Component } = useComponentLazyLoad(importFunction, options);
    return <Component {...props} />;
  };
}

/**
 * 代码分割工具函数
 */
export const createLazyComponent = <P = Record<string, unknown>>(
  importFunction: () => Promise<{ default: React.ComponentType<P> }>,
  fallback?: React.ComponentType
) => {
  return withLazyLoad(importFunction, { fallback });
};