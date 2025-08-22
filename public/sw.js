const CACHE_NAME = 'baby-growth-assistant-v1.0.0';
const OFFLINE_URL = '/offline';

// 需要缓存的关键资源
const PRECACHE_ASSETS = [
  '/',
  '/dashboard',
  '/milestones',
  '/records',
  '/offline',
  '/manifest.json',
  // 添加关键的静态资源
  '/_next/static/css/app/globals.css',
];

// 需要缓存的API路径
const API_CACHE_PATTERNS = [
  /^\/api\/babies/,
  /^\/api\/milestones/,
  /^\/api\/records/,
];

// 网络优先策略的路径
const NETWORK_FIRST_PATTERNS = [
  /^\/api\/ai/,
  /^\/api\/auth/,
];

// 缓存优先策略的路径
const CACHE_FIRST_PATTERNS = [
  /\.(js|css|woff|woff2|ttf|eot)$/,
  /^\/icons\//,
  /^\/images\//,
];

self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker');
  
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      
      try {
        // 预缓存关键资源
        await cache.addAll(PRECACHE_ASSETS);
        console.log('[SW] Precached assets');
      } catch (error) {
        console.warn('[SW] Precaching failed:', error);
        // 逐个缓存，避免单个资源失败影响整体
        for (const asset of PRECACHE_ASSETS) {
          try {
            await cache.add(asset);
          } catch (e) {
            console.warn(`[SW] Failed to cache ${asset}:`, e);
          }
        }
      }
      
      // 强制激活新的service worker
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker');
  
  event.waitUntil(
    (async () => {
      // 清理旧缓存
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => {
            console.log(`[SW] Deleting cache: ${name}`);
            return caches.delete(name);
          })
      );
      
      // 立即控制所有客户端
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // 只处理同源请求
  if (url.origin !== self.location.origin) {
    return;
  }
  
  // 处理导航请求
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigate(request));
    return;
  }
  
  // 处理API请求
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }
  
  // 处理静态资源
  event.respondWith(handleStaticAssets(request));
});

// 处理导航请求（页面）
async function handleNavigate(request) {
  try {
    // 网络优先
    const networkResponse = await fetch(request);
    
    // 缓存成功的响应
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed for navigation, trying cache');
    
    // 尝试从缓存获取
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // 返回离线页面
    const offlineResponse = await caches.match(OFFLINE_URL);
    return offlineResponse || new Response('离线状态', { status: 503 });
  }
}

// 处理API请求
async function handleApiRequest(request) {
  const url = new URL(request.url);
  
  // 网络优先的API（如AI、认证）
  if (NETWORK_FIRST_PATTERNS.some(pattern => pattern.test(url.pathname))) {
    return networkFirst(request);
  }
  
  // 可缓存的API（如婴儿数据、里程碑）
  if (API_CACHE_PATTERNS.some(pattern => pattern.test(url.pathname))) {
    return cacheFirst(request, { maxAge: 5 * 60 * 1000 }); // 5分钟缓存
  }
  
  // 默认网络优先
  return networkFirst(request);
}

// 处理静态资源
async function handleStaticAssets(request) {
  const url = new URL(request.url);
  
  // 缓存优先的资源
  if (CACHE_FIRST_PATTERNS.some(pattern => pattern.test(url.pathname))) {
    return cacheFirst(request, { maxAge: 24 * 60 * 60 * 1000 }); // 24小时缓存
  }
  
  // 其他资源网络优先
  return networkFirst(request);
}

// 网络优先策略
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

// 缓存优先策略
async function cacheFirst(request, options = {}) {
  const { maxAge = 24 * 60 * 60 * 1000 } = options;
  
  try {
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      const dateHeader = cachedResponse.headers.get('date');
      if (dateHeader) {
        const cacheTime = new Date(dateHeader).getTime();
        const now = Date.now();
        
        // 如果缓存未过期，直接返回
        if (now - cacheTime < maxAge) {
          return cachedResponse;
        }
      }
    }
    
    // 缓存过期或不存在，从网络获取
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // 网络失败，返回缓存（即使过期）
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

// 后台同步（如果支持）
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(handleBackgroundSync());
  }
});

async function handleBackgroundSync() {
  console.log('[SW] Performing background sync');
  
  try {
    // 同步离线时创建的记录
    const offlineData = await getOfflineData();
    if (offlineData.length > 0) {
      await syncOfflineData(offlineData);
      await clearOfflineData();
    }
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

// 获取离线数据（从IndexedDB等）
async function getOfflineData() {
  // TODO: 实现从IndexedDB获取离线数据
  return [];
}

// 同步离线数据
async function syncOfflineData(data) {
  // TODO: 实现离线数据同步
  for (const item of data) {
    try {
      await fetch('/api/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(item),
      });
    } catch (error) {
      console.error('[SW] Failed to sync item:', item, error);
    }
  }
}

// 清除已同步的离线数据
async function clearOfflineData() {
  // TODO: 实现清除离线数据
}

// 推送通知
self.addEventListener('push', (event) => {
  const options = {
    body: '您有新的宝宝成长提醒',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '2'
    },
    actions: [
      {
        action: 'explore',
        title: '查看详情',
        icon: '/icons/checkmark.png'
      },
      {
        action: 'close',
        title: '关闭',
        icon: '/icons/xmark.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('宝宝成长助手', options)
  );
});

// 通知点击处理
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/dashboard')
    );
  }
});

// 错误处理
self.addEventListener('error', (event) => {
  console.error('[SW] Error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('[SW] Unhandled promise rejection:', event.reason);
});