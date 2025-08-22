'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { clsx } from 'clsx';

const navItems = [
  {
    href: '/dashboard',
    label: '首页',
    emoji: '🏠',
    activeColor: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  {
    href: '/records',
    label: '记录',
    emoji: '📊',
    activeColor: 'text-green-600',
    bgColor: 'bg-green-50',
  },
  {
    href: '/milestones',
    label: '里程碑',
    emoji: '🎯',
    activeColor: 'text-orange-600',
    bgColor: 'bg-orange-50',
  },
  {
    href: '/profile',
    label: '档案',
    emoji: '👤',
    activeColor: 'text-purple-600',
    bgColor: 'bg-purple-50',
  },
];

const quickActions = [
  {
    href: '/records/feeding',
    label: '记录喂养',
    emoji: '🍼',
    color: 'bg-green-500',
  },
  {
    href: '/records/sleep',
    label: '记录睡眠',
    emoji: '😴',
    color: 'bg-purple-500',
  },
  {
    href: '/milestones',
    label: '查看里程碑',
    emoji: '🎯',
    color: 'bg-orange-500',
  },
];

export function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [showQuickActions, setShowQuickActions] = useState(false);

  const toggleQuickActions = () => {
    setShowQuickActions(!showQuickActions);
  };

  return (
    <>
      {/* 底部导航栏 - 增强版 */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200/50 z-50 lg:hidden safe-area-bottom">
        <div className="flex items-center justify-around px-2 py-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  'flex flex-col items-center py-2 px-3 rounded-xl transition-all duration-200 touch-friendly min-w-[60px] active:scale-95',
                  isActive 
                    ? `${item.activeColor} ${item.bgColor}` 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                )}
              >
                <div className={clsx(
                  'text-2xl mb-1 transition-transform duration-200',
                  isActive ? 'scale-110' : ''
                )}>
                  {item.emoji}
                </div>
                <span className={clsx(
                  'text-xs leading-none',
                  isActive ? 'font-semibold' : 'font-medium'
                )}>
                  {item.label}
                </span>
                {isActive && (
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-current rounded-full mt-1" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* 悬浮快速操作按钮组 */}
      <div className="fixed bottom-20 right-4 z-50 lg:hidden">
        <div className="relative">
          {/* 快速操作按钮 */}
          {showQuickActions && (
            <div className="absolute bottom-16 right-0 flex flex-col gap-3 animate-in slide-in-from-bottom-4 duration-200">
              {quickActions.map((action, index) => (
                <button
                  key={action.href}
                  onClick={() => {
                    router.push(action.href);
                    setShowQuickActions(false);
                  }}
                  className={clsx(
                    'flex items-center gap-3 text-white px-4 py-3 rounded-full shadow-lg text-sm font-medium whitespace-nowrap transition-all duration-200 active:scale-95 touch-friendly',
                    action.color
                  )}
                  style={{
                    animationDelay: `${index * 50}ms`
                  }}
                >
                  <span className="text-lg">{action.emoji}</span>
                  <span>{action.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* 遮罩层 */}
          {showQuickActions && (
            <div
              className="fixed inset-0 bg-black/20 -z-10"
              onClick={() => setShowQuickActions(false)}
            />
          )}

          {/* 主按钮 */}
          <button
            onClick={toggleQuickActions}
            className={clsx(
              'text-white p-4 rounded-full shadow-lg transition-all duration-200 touch-friendly active:scale-90',
              showQuickActions 
                ? 'bg-gray-500 rotate-45' 
                : 'bg-blue-500 hover:bg-blue-600'
            )}
          >
            <svg 
              className="w-6 h-6" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 6v6m0 0v6m0-6h6m-6 0H6" 
              />
            </svg>
          </button>
        </div>
      </div>

      {/* 底部安全区域 */}
      <div className="h-20 lg:hidden" />
    </>
  );
}

// 简化版底部导航 - 适用于某些特定页面
export function SimpleBottomNav() {
  const router = useRouter();
  
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 lg:hidden safe-area-bottom">
      <div className="flex gap-3">
        <button
          onClick={() => router.back()}
          className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 px-4 rounded-xl font-medium transition-all active:scale-95 touch-friendly"
        >
          ← 返回
        </button>
        <button
          onClick={() => router.push('/dashboard')}
          className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-3 px-4 rounded-xl font-medium transition-all active:scale-95 touch-friendly"
        >
          🏠 首页
        </button>
      </div>
    </div>
  );
}