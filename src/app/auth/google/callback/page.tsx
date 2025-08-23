'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

function GoogleCallbackContent() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>({});

  useEffect(() => {
    const handleGoogleCallback = async () => {
      try {
        console.log('Starting Google OAuth callback handler...');
        const url = window.location.href;
        console.log('Current URL:', url);
        
        // 收集调试信息
        const currentDebugInfo = {
          url,
          hash: window.location.hash,
          search: window.location.search,
          timestamp: new Date().toISOString()
        };
        setDebugInfo(currentDebugInfo);

        // 检查 URL 中是否有认证代码
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        
        console.log('OAuth code:', code ? 'Present' : 'Missing');
        console.log('OAuth state:', state ? 'Present' : 'Missing');

        if (code) {
          console.log('Processing OAuth code...');
          
          // 使用 exchangeCodeForSession 处理 OAuth 代码
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(url);
          
          if (exchangeError) {
            console.error('Exchange code error:', exchangeError);
            setError(`认证失败: ${exchangeError.message}`);
            return;
          }

          if (data.session && data.user) {
            console.log('Authentication successful!', data.user.email);
            console.log('Redirecting to dashboard...');
            router.replace('/dashboard');
            return;
          } else {
            console.error('No session or user after exchange');
            setError('认证成功但无法创建会话');
            return;
          }
        }

        // 如果没有代码，检查是否有现有会话
        console.log('No OAuth code found, checking existing session...');
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session check error:', sessionError);
          setError(`会话检查失败: ${sessionError.message}`);
          return;
        }

        if (sessionData.session) {
          console.log('Found existing session, redirecting to dashboard');
          router.replace('/dashboard');
        } else {
          console.log('No session found, redirecting to login');
          setError('未找到认证信息，请重新登录');
        }
        
      } catch (err) {
        console.error('Unexpected error in Google callback:', err);
        setError(`意外错误: ${(err as Error).message}`);
      } finally {
        setLoading(false);
      }
    };

    // 稍微延迟执行，确保页面完全加载
    const timer = setTimeout(handleGoogleCallback, 500);
    
    return () => clearTimeout(timer);
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-blue-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 text-center">
            <div className="text-6xl mb-4">🔐</div>
            <h1 className="text-2xl font-bold text-gray-800 mb-4">正在处理 Google 登录</h1>
            <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">请稍候，正在验证您的身份...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-blue-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 text-center">
            <div className="text-6xl mb-4">❌</div>
            <h1 className="text-2xl font-bold text-gray-800 mb-4">Google 登录失败</h1>
            <p className="text-gray-600 mb-4">{error}</p>
            <div className="text-xs text-gray-400 mb-6 p-3 bg-gray-50 rounded">
              <details>
                <summary>调试信息</summary>
                <pre className="mt-2 text-left overflow-auto">
                  {JSON.stringify(debugInfo, null, 2)}
                </pre>
              </details>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => router.push('/login')}
                className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                重新登录
              </button>
              <button
                onClick={() => router.push('/debug-auth')}
                className="flex-1 bg-gray-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-700 transition-colors"
              >
                详细调试
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

// Loading component for Suspense fallback
function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 text-center">
          <div className="text-6xl mb-4">⏳</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">加载中</h1>
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">正在初始化...</p>
        </div>
      </div>
    </div>
  );
}

// Main page component
export default function GoogleCallbackPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <GoogleCallbackContent />
    </Suspense>
  );
}