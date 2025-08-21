'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';

export default function TestRecordsPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-blue-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">测试记录页面</h1>
          <p className="text-gray-600 mb-6">这是一个简化的测试页面来检查基本功能。</p>
          <Button onClick={() => router.push('/dashboard')}>
            返回首页
          </Button>
        </div>
      </div>
    </div>
  );
}