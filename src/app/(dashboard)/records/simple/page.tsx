'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/Button';

export default function SimpleRecordsPage() {
  const { user } = useAuth();
  const router = useRouter();

  // 如果没有宝宝档案，提示创建
  if (!user?.babies || user.babies.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-blue-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-6 md:p-8 text-center">
            <h1 className="text-2xl font-bold text-gray-800 mb-4">记录时间线</h1>
            <p className="text-gray-600 mb-6">请先创建宝宝档案才能查看记录</p>
            <Button onClick={() => router.push('/create-profile')}>
              创建宝宝档案
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-blue-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* 页面标题 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">记录时间线</h1>
            <p className="text-gray-600">查看宝宝的成长记录</p>
          </div>
          <Button variant="outline" onClick={() => router.push('/dashboard')}>
            返回首页
          </Button>
        </div>

        {/* 简化的内容 */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="text-center">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              记录时间线功能
            </h3>
            <p className="text-gray-600 mb-6">
              这里将显示宝宝的所有记录
            </p>
            <div className="flex justify-center gap-3">
              <Button onClick={() => router.push('/records/feeding')}>
                添加喂养记录
              </Button>
              <Button variant="outline" onClick={() => router.push('/records/sleep')}>
                添加睡眠记录
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}