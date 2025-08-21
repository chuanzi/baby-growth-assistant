'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { Menu, X, LogOut, Baby } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function TopBar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const selectedBaby = user?.babies?.[0];

  return (
    <>
      {/* 顶部导航栏 */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* 左侧 - 应用标题和宝宝信息 */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="text-2xl">👶</div>
                <div className="hidden sm:block">
                  <h1 className="text-lg font-bold text-gray-900">宝宝成长助手</h1>
                  {selectedBaby && (
                    <p className="text-sm text-gray-600">{selectedBaby.name}</p>
                  )}
                </div>
              </div>
            </div>

            {/* 中间 - 桌面端导航菜单 */}
            <nav className="hidden md:flex space-x-8">
              <a
                href="/dashboard"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium transition-colors"
              >
                首页
              </a>
              <a
                href="/timeline"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium transition-colors"
              >
                时间线
              </a>
              <a
                href="/milestones"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium transition-colors"
              >
                里程碑
              </a>
              <a
                href="/profile"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium transition-colors"
              >
                档案
              </a>
            </nav>

            {/* 右侧 - 用户菜单 */}
            <div className="flex items-center gap-2">
              {/* 桌面端用户菜单 */}
              <div className="hidden md:flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  {user?.phone || user?.email}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push('/create-profile')}
                  className="hidden lg:flex"
                >
                  <Baby size={16} className="mr-1" />
                  管理档案
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                >
                  <LogOut size={16} className="mr-1" />
                  退出
                </Button>
              </div>

              {/* 移动端菜单按钮 */}
              <button
                onClick={toggleMenu}
                className="md:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              >
                {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* 移动端下拉菜单 */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-gray-200 bg-white">
            <div className="px-4 py-3 space-y-3">
              {selectedBaby && (
                <div className="pb-3 border-b border-gray-200">
                  <p className="text-lg font-medium text-gray-900">{selectedBaby.name}</p>
                  <p className="text-sm text-gray-600">宝宝档案</p>
                </div>
              )}
              
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  用户信息
                </p>
                <p className="text-sm text-gray-700">{user?.phone || user?.email}</p>
              </div>

              <div className="space-y-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    router.push('/create-profile');
                    setIsMenuOpen(false);
                  }}
                  className="w-full justify-start"
                >
                  <Baby size={16} className="mr-2" />
                  管理宝宝档案
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => {
                    handleLogout();
                    setIsMenuOpen(false);
                  }}
                  className="w-full justify-start"
                >
                  <LogOut size={16} className="mr-2" />
                  退出登录
                </Button>
              </div>
            </div>
          </div>
        )}
      </header>
    </>
  );
}