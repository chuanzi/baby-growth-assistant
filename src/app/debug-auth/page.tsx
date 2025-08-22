'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function DebugAuthPage() {
  const [info, setInfo] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getAuthInfo = async () => {
      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        const { data: userData, error: userError } = await supabase.auth.getUser();
        
        setInfo({
          url: window.location.href,
          hash: window.location.hash,
          search: window.location.search,
          session: sessionData,
          sessionError: sessionError?.message,
          user: userData,
          userError: userError?.message,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        setInfo({
          error: (error as Error).message,
          timestamp: new Date().toISOString()
        });
      } finally {
        setLoading(false);
      }
    };

    getAuthInfo();
  }, []);

  if (loading) {
    return <div className="p-4">加载中...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">认证调试信息</h1>
        <div className="bg-white rounded-lg shadow p-6">
          <pre className="text-xs overflow-auto">
            {JSON.stringify(info, null, 2)}
          </pre>
        </div>
        <div className="mt-4">
          <button 
            onClick={() => window.location.href = '/auth/callback'}
            className="bg-blue-500 text-white px-4 py-2 rounded mr-2"
          >
            测试回调页面
          </button>
          <button 
            onClick={() => window.location.href = '/login'}
            className="bg-gray-500 text-white px-4 py-2 rounded"
          >
            返回登录
          </button>
        </div>
      </div>
    </div>
  );
}