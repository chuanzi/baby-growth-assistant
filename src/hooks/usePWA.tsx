'use client';

import { useState, useEffect, useCallback } from 'react';

interface PWAInstallPrompt {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface NetworkStatus {
  isOnline: boolean;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
}

/**
 * PWA功能管理Hook
 */
export function usePWA() {
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<PWAInstallPrompt | null>(null);
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  });
  const [isServiceWorkerSupported, setIsServiceWorkerSupported] = useState(false);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);

  // 检查PWA安装状态
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 检查是否已安装（通过display-mode检测）
    const checkInstallStatus = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isInWebapp = window.navigator.standalone === true; // iOS Safari
      setIsInstalled(isStandalone || isInWebapp);
    };

    checkInstallStatus();

    // 监听display-mode变化
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    mediaQuery.addEventListener('change', checkInstallStatus);

    return () => {
      mediaQuery.removeEventListener('change', checkInstallStatus);
    };
  }, []);

  // 监听安装提示事件
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as PWAInstallPrompt);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setInstallPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // 网络状态监听
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateNetworkStatus = () => {
      const connection = (navigator as Navigator & { connection?: { effectiveType?: string; downlink?: number; rtt?: number; addEventListener: (type: string, listener: () => void) => void; removeEventListener: (type: string, listener: () => void) => void } }).connection;
      setNetworkStatus({
        isOnline: navigator.onLine,
        effectiveType: connection?.effectiveType,
        downlink: connection?.downlink,
        rtt: connection?.rtt,
      });
    };

    const handleOnline = () => {
      updateNetworkStatus();
    };

    const handleOffline = () => {
      updateNetworkStatus();
    };

    const handleConnectionChange = () => {
      updateNetworkStatus();
    };

    updateNetworkStatus();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const connection = (navigator as Navigator & { connection?: { effectiveType?: string; downlink?: number; rtt?: number; addEventListener: (type: string, listener: () => void) => void; removeEventListener: (type: string, listener: () => void) => void } }).connection;
    if (connection) {
      connection.addEventListener('change', handleConnectionChange);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (connection) {
        connection.removeEventListener('change', handleConnectionChange);
      }
    };
  }, []);

  // Service Worker注册
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    setIsServiceWorkerSupported(true);

    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });

        setSwRegistration(registration);

        console.log('Service Worker registered successfully:', registration);

        // 监听Service Worker更新
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // 新版本可用
                console.log('New version available');
                showUpdatePrompt();
              }
            });
          }
        });

      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    };

    registerSW();
  }, []);

  // 安装PWA
  const installPWA = useCallback(async () => {
    if (!installPrompt) {
      return false;
    }

    try {
      await installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setIsInstallable(false);
        setInstallPrompt(null);
        return true;
      }
      return false;
    } catch (error) {
      console.error('PWA installation failed:', error);
      return false;
    }
  }, [installPrompt]);

  // 显示更新提示
  const showUpdatePrompt = useCallback(() => {
    if (typeof window === 'undefined') return;

    const shouldUpdate = window.confirm('应用有新版本可用，是否立即更新？');
    if (shouldUpdate) {
      window.location.reload();
    }
  }, []);

  // 获取缓存大小估算
  const getCacheSize = useCallback(async () => {
    if (!('storage' in navigator && 'estimate' in navigator.storage)) {
      return null;
    }

    try {
      const estimate = await navigator.storage.estimate();
      return {
        quota: estimate.quota,
        usage: estimate.usage,
        usageDetails: estimate.usageDetails,
      };
    } catch (error) {
      console.error('Failed to get storage estimate:', error);
      return null;
    }
  }, []);

  // 清理缓存
  const clearCache = useCallback(async () => {
    if (!('caches' in window)) return false;

    try {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(name => caches.delete(name))
      );
      
      if (swRegistration) {
        await swRegistration.update();
      }
      
      return true;
    } catch (error) {
      console.error('Failed to clear cache:', error);
      return false;
    }
  }, [swRegistration]);

  // 检查网络质量
  const getNetworkQuality = useCallback((): 'good' | 'poor' | 'offline' => {
    if (!networkStatus.isOnline) return 'offline';
    
    const { effectiveType, downlink, rtt } = networkStatus;
    
    if (effectiveType === '4g' && (downlink || 0) > 1.5 && (rtt || 0) < 300) {
      return 'good';
    }
    
    if (effectiveType === 'slow-2g' || (downlink || 0) < 0.5 || (rtt || 0) > 1000) {
      return 'poor';
    }
    
    return 'good';
  }, [networkStatus]);

  // 预缓存关键页面
  const precachePages = useCallback(async (pages: string[]) => {
    if (!('caches' in window)) return false;

    try {
      const cache = await caches.open('page-cache-v1');
      await cache.addAll(pages);
      return true;
    } catch (error) {
      console.error('Failed to precache pages:', error);
      return false;
    }
  }, []);

  // 请求通知权限
  const requestNotificationPermission = useCallback(async () => {
    if (!('Notification' in window)) return 'not-supported';
    
    if (Notification.permission === 'granted') {
      return 'granted';
    }
    
    if (Notification.permission === 'denied') {
      return 'denied';
    }
    
    try {
      const permission = await Notification.requestPermission();
      return permission;
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      return 'denied';
    }
  }, []);

  return {
    // 安装状态
    isInstallable,
    isInstalled,
    installPWA,
    
    // 网络状态
    networkStatus,
    getNetworkQuality,
    
    // Service Worker
    isServiceWorkerSupported,
    swRegistration,
    
    // 缓存管理
    getCacheSize,
    clearCache,
    precachePages,
    
    // 通知
    requestNotificationPermission,
  };
}

/**
 * PWA安装提示组件
 */
export function PWAInstallPrompt() {
  const { isInstallable, installPWA } = usePWA();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isInstallable) {
      // 延迟显示安装提示，避免打扰用户
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [isInstallable]);

  if (!isVisible) return null;

  const handleInstall = async () => {
    const success = await installPWA();
    if (success) {
      setIsVisible(false);
    }
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 bg-primary text-primary-foreground p-4 rounded-lg shadow-lg z-50 animate-slide-up">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h3 className="font-medium">安装宝宝成长助手</h3>
          <p className="text-sm opacity-90">获得更好的使用体验，支持离线访问</p>
        </div>
        <div className="flex gap-2 ml-4">
          <button
            onClick={() => setIsVisible(false)}
            className="px-3 py-1 text-sm opacity-75 hover:opacity-100"
          >
            稍后
          </button>
          <button
            onClick={handleInstall}
            className="px-4 py-2 bg-white/20 rounded text-sm font-medium hover:bg-white/30 touch-friendly"
          >
            安装
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * 网络状态指示器组件
 */
export function NetworkStatusIndicator() {
  const { networkStatus, getNetworkQuality } = usePWA();
  const quality = getNetworkQuality();

  if (quality === 'good') return null;

  return (
    <div className={`
      fixed top-0 left-0 right-0 text-center py-1 text-xs z-50
      ${quality === 'offline' ? 'bg-destructive text-destructive-foreground' : 'bg-amber-500 text-white'}
    `}>
      {quality === 'offline' ? '离线模式' : '网络连接较慢'}
    </div>
  );
}