'use client';

import React, { useState, useEffect } from 'react';
import { useSupabaseAuth } from '@/lib/supabase-auth-context';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { CompactAgeDisplay } from '@/components/ui/AgeDisplay';
import { calculateAge } from '@/utils/age-calculator';
import { clsx } from 'clsx';

export function TopBar() {
  const { user, signOut } = useSupabaseAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  // Close menu on route change
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  const selectedBaby = user?.babies?.[0];
  const ageInfo = selectedBaby ? calculateAge(selectedBaby) : null;

  const getPageTitle = () => {
    if (pathname === '/dashboard') return '首页';
    if (pathname.startsWith('/milestones')) return '里程碑';
    if (pathname.startsWith('/records')) return '记录';
    if (pathname.startsWith('/profile') || pathname.startsWith('/create-profile')) return '档案';
    return '宝宝成长助手';
  };

  return (
    <>
      {/* 顶部导航栏 - 移动优化版 */}
      <header className="bg-white/95 backdrop-blur-md border-b border-gray-200/50 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            {/* 左侧 - 应用标题和返回按钮 */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.back()}
                className="lg:hidden p-2 -ml-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 active:scale-95 transition-all touch-friendly"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <div className="flex items-center gap-2">
                <div className="text-2xl">👶</div>
                <div>
                  <h1 className="text-lg font-bold text-gray-900 leading-none">
                    {getPageTitle()}
                  </h1>
                  {selectedBaby && (
                    <p className="text-xs text-gray-500 hidden sm:block">
                      {selectedBaby.name}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* 中间 - 年龄显示（仅桌面端显示宝宝信息） */}
            <div className="hidden lg:flex items-center">
              {selectedBaby && ageInfo && (
                <CompactAgeDisplay ageInfo={ageInfo} />
              )}
            </div>

            {/* 右侧 - 用户菜单和操作 */}
            <div className="flex items-center gap-2">
              {/* 桌面端用户菜单 */}
              <div className="hidden lg:flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-700">
                    {user?.email || user?.phone}
                  </p>
                  <p className="text-xs text-gray-500">已登录</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push('/create-profile')}
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  档案
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  退出
                </Button>
              </div>

              {/* 移动端菜单按钮 */}
              <button
                onClick={toggleMenu}
                className={clsx(
                  'lg:hidden p-2 rounded-lg transition-all touch-friendly active:scale-95',
                  isMenuOpen 
                    ? 'text-blue-600 bg-blue-50' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                )}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {isMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* 移动端下拉菜单 */}
        {isMenuOpen && (
          <div className="lg:hidden border-t border-gray-200 bg-white/95 backdrop-blur-md">
            <div className="px-4 py-4 space-y-4">
              {/* 宝宝信息卡片 */}
              {selectedBaby && ageInfo && (
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 border border-blue-200">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="text-2xl">👶</div>
                    <div>
                      <h3 className="font-semibold text-gray-800">{selectedBaby.name}</h3>
                      <p className="text-xs text-gray-600">宝宝档案</p>
                    </div>
                  </div>
                  <CompactAgeDisplay ageInfo={ageInfo} className="mt-2" />
                </div>
              )}
              
              {/* 用户信息 */}
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs font-medium text-gray-500 mb-1">当前用户</p>
                <p className="text-sm font-medium text-gray-800">{user?.email || user?.phone}</p>
              </div>

              {/* 操作按钮 */}
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    router.push('/create-profile');
                    setIsMenuOpen(false);
                  }}
                  className="touch-friendly justify-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  管理档案
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => {
                    handleLogout();
                    setIsMenuOpen(false);
                  }}
                  className="touch-friendly justify-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  退出登录
                </Button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* 遮罩层 - 移动端菜单打开时 */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-30 lg:hidden"
          onClick={() => setIsMenuOpen(false)}
        />
      )}
    </>
  );
}