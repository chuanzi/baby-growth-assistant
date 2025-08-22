'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function TestLoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleTestLogin = async () => {
    setLoading(true);
    setError('');

    try {
      // 使用测试用户登录
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'Test123456'
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Login successful:', result);
        // 刷新页面以触发认证检查
        window.location.href = '/dashboard';
      } else {
        const result = await response.json();
        setError(result.error || '登录失败');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('网络错误');
    } finally {
      setLoading(false);
    }
  };

  const handleTestRegister = async () => {
    setLoading(true);
    setError('');

    try {
      // 注册测试用户
      const registerResponse = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'Test123456',
          confirmPassword: 'Test123456'
        }),
      });

      if (registerResponse.ok) {
        console.log('Registration successful');
        // 注册成功后自动登录
        await handleTestLogin();
      } else {
        const result = await registerResponse.json();
        setError(result.error || '注册失败');
      }
    } catch (error) {
      console.error('Register error:', error);
      setError('注册失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-blue-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-xl shadow-lg p-6 md:p-8">
          <h1 className="text-2xl font-bold text-center mb-6">测试登录</h1>
          
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <button
              onClick={handleTestRegister}
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? '处理中...' : '注册测试用户'}
            </button>

            <button
              onClick={handleTestLogin}
              disabled={loading}
              className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? '处理中...' : '登录测试用户'}
            </button>

            <div className="text-sm text-gray-600 text-center">
              <p>测试账号：test@example.com</p>
              <p>密码：Test123456</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}