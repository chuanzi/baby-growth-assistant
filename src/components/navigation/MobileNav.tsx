'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Clock, TrendingUp, User, Plus } from 'lucide-react';

const navItems = [
  {
    href: '/dashboard',
    label: '首页',
    icon: Home,
  },
  {
    href: '/timeline',
    label: '时间线',
    icon: Clock,
  },
  {
    href: '/milestones',
    label: '里程碑',
    icon: TrendingUp,
  },
  {
    href: '/profile',
    label: '档案',
    icon: User,
  },
];

const quickActions = [
  {
    href: '/records/feeding',
    label: '喂养',
    emoji: '🍼',
  },
  {
    href: '/records/sleep',
    label: '睡眠',
    emoji: '😴',
  },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <>
      {/* 底部导航栏 */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 md:hidden">
        <div className="flex items-center justify-around py-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const IconComponent = item.icon;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center py-2 px-3 text-xs transition-colors ${
                  isActive 
                    ? 'text-blue-600' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <IconComponent 
                  size={20} 
                  className={`mb-1 ${isActive ? 'text-blue-600' : 'text-gray-600'}`} 
                />
                <span className={isActive ? 'font-medium' : ''}>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* 悬浮添加按钮 */}
      <div className="fixed bottom-20 right-4 z-50 md:hidden">
        <div className="relative group">
          {/* 主按钮 */}
          <button className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg transition-all duration-200 group-hover:scale-110">
            <Plus size={24} />
          </button>
          
          {/* 快速操作菜单 */}
          <div className="absolute bottom-full right-0 mb-2 opacity-0 group-hover:opacity-100 transition-all duration-200 transform translate-y-2 group-hover:translate-y-0 pointer-events-none group-hover:pointer-events-auto">
            <div className="flex flex-col gap-2">
              {quickActions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="bg-white hover:bg-gray-50 border border-gray-200 rounded-full px-4 py-2 shadow-md text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors whitespace-nowrap flex items-center gap-2"
                >
                  <span>{action.emoji}</span>
                  <span>{action.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 底部安全区域 - 确保内容不被底部导航遮挡 */}
      <div className="h-16 md:hidden" />
    </>
  );
}