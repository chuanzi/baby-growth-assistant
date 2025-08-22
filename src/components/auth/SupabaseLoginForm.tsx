'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/lib/supabase';
import { useSupabaseAuth } from '@/lib/supabase-auth-context';
import { Button } from '@/components/ui/Button';
import { EmailInput } from '@/components/forms/EmailInput';
import { 
  emailLoginSchema,
  type EmailLoginFormData 
} from '@/lib/validations';

export default function SupabaseLoginForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showEmailForm, setShowEmailForm] = useState(false);
  const router = useRouter();
  const { signInWithGoogle, signInWithEmail } = useSupabaseAuth();

  // 邮箱登录表单
  const emailForm = useForm<EmailLoginFormData>({
    resolver: zodResolver(emailLoginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // Google 登录处理
  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');

    try {
      await signInWithGoogle();
    } catch (error: any) {
      console.error('Google login error:', error);
      setError(error.message || 'Google 登录失败');
    } finally {
      setLoading(false);
    }
  };

  // 邮箱登录处理
  const onEmailSubmit = async (data: EmailLoginFormData) => {
    setLoading(true);
    setError('');

    try {
      const { error: authError } = await signInWithEmail(data.email, data.password);
      
      if (authError) {
        setError(authError.message || '登录失败');
      } else {
        router.push('/dashboard');
      }
    } catch (error: any) {
      console.error('Email login error:', error);
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="text-5xl mb-4">👶</div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
              宝宝成长助手
            </h1>
            <h2 className="text-lg font-semibold text-gray-700 mb-2">欢迎回来</h2>
            <p className="text-gray-600 text-sm">请选择登录方式继续使用</p>
          </div>

          {!showEmailForm ? (
            <div className="space-y-4">
              {/* Google 登录按钮 */}
              <Button
                onClick={handleGoogleLogin}
                className="w-full h-12 text-base font-medium bg-white border-2 border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 flex items-center justify-center space-x-3"
                loading={loading}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span>{loading ? '登录中...' : '使用 Google 账号登录'}</span>
              </Button>

              {/* 分割线 */}
              <div className="relative flex items-center justify-center my-6">
                <div className="border-t border-gray-200 w-full"></div>
                <div className="bg-white px-4 text-sm text-gray-500 absolute">或</div>
              </div>

              {/* 邮箱登录按钮 */}
              <Button
                onClick={() => setShowEmailForm(true)}
                className="w-full h-12 text-base font-medium bg-blue-600 hover:bg-blue-700 text-white"
              >
                使用邮箱登录
              </Button>
            </div>
          ) : (
            <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-6">
              <EmailInput
                email={emailForm.watch('email')}
                password={emailForm.watch('password')}
                onEmailChange={(value) => emailForm.setValue('email', value)}
                onPasswordChange={(value) => emailForm.setValue('password', value)}
                emailError={emailForm.formState.errors.email?.message}
                passwordError={emailForm.formState.errors.password?.message}
              />

              <div className="flex space-x-3">
                <Button
                  type="button"
                  onClick={() => {
                    setShowEmailForm(false);
                    setError('');
                    emailForm.reset();
                  }}
                  className="flex-1 h-12 text-base font-medium bg-gray-200 hover:bg-gray-300 text-gray-700"
                >
                  返回
                </Button>
                <Button
                  type="submit"
                  className="flex-1 h-12 text-base font-medium"
                  loading={loading}
                  disabled={!emailForm.watch('email') || !emailForm.watch('password')}
                >
                  {loading ? '登录中...' : '登录'}
                </Button>
              </div>
            </form>
          )}

          {/* Enhanced error display */}
          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 mt-6 rounded-r-lg">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-800 font-medium">登录失败</p>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-gray-600 text-sm">
              还没有账户？
              <Link
                href="/register"
                className="text-blue-600 hover:text-blue-700 font-medium ml-1 hover:underline"
              >
                立即注册
              </Link>
            </p>
          </div>

          {/* Help section */}
          <div className="mt-6 pt-6 border-t border-gray-100">
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-2">需要帮助？</p>
              <div className="flex justify-center space-x-4 text-xs">
                <button className="text-blue-600 hover:text-blue-700 hover:underline">
                  忘记密码
                </button>
                <button className="text-blue-600 hover:text-blue-700 hover:underline">
                  联系客服
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Additional info */}
        <div className="text-center mt-4 text-xs text-gray-500">
          登录即表示同意我们的{' '}
          <button className="text-blue-600 hover:underline">服务条款</button> 和{' '}
          <button className="text-blue-600 hover:underline">隐私政策</button>
        </div>
      </div>
    </div>
  );
}