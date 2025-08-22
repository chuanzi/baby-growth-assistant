'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSupabaseAuth } from '@/lib/supabase-auth-context';
import { Button } from '@/components/ui/Button';
import { EmailInput } from '@/components/forms/EmailInput';
import { 
  emailRegisterSchema,
  type EmailRegisterFormData 
} from '@/lib/validations';

export default function SupabaseRegisterForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const router = useRouter();
  const { signInWithGoogle, signUpWithEmail } = useSupabaseAuth();

  // 邮箱注册表单
  const emailForm = useForm<EmailRegisterFormData>({
    resolver: zodResolver(emailRegisterSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  // Google 登录处理
  const handleGoogleSignUp = async () => {
    setLoading(true);
    setError('');

    try {
      await signInWithGoogle();
    } catch (error: any) {
      console.error('Google sign up error:', error);
      setError(error.message || 'Google 注册失败');
    } finally {
      setLoading(false);
    }
  };

  // 邮箱注册处理
  const onEmailSubmit = async (data: EmailRegisterFormData) => {
    setLoading(true);
    setError('');

    try {
      const { error: authError } = await signUpWithEmail(data.email, data.password);
      
      if (authError) {
        setError(authError.message || '注册失败');
      } else {
        setSuccess(true);
        // 注册成功后显示成功消息，用户需要验证邮箱
      }
    } catch (error: any) {
      console.error('Email sign up error:', error);
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-blue-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 text-center">
            <div className="text-6xl mb-4">✨</div>
            <h1 className="text-2xl font-bold text-gray-800 mb-4">注册成功！</h1>
            <p className="text-gray-600 mb-6">
              我们已向您的邮箱发送了验证链接，请查收邮件并点击链接完成账户激活。
            </p>
            <Button
              onClick={() => router.push('/login')}
              className="w-full h-12 text-base font-medium"
            >
              返回登录
            </Button>
          </div>
        </div>
      </div>
    );
  }

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
            <h2 className="text-lg font-semibold text-gray-700 mb-2">创建账户</h2>
            <p className="text-gray-600 text-sm">开始记录宝宝的成长历程</p>
          </div>

          {!showEmailForm ? (
            <div className="space-y-4">
              {/* Google 注册按钮 */}
              <Button
                onClick={handleGoogleSignUp}
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
                <span>{loading ? '注册中...' : '使用 Google 账号注册'}</span>
              </Button>

              {/* 分割线 */}
              <div className="relative flex items-center justify-center my-6">
                <div className="border-t border-gray-200 w-full"></div>
                <div className="bg-white px-4 text-sm text-gray-500 absolute">或</div>
              </div>

              {/* 邮箱注册按钮 */}
              <Button
                onClick={() => setShowEmailForm(true)}
                className="w-full h-12 text-base font-medium bg-blue-600 hover:bg-blue-700 text-white"
              >
                使用邮箱注册
              </Button>
            </div>
          ) : (
            <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-6">
              <EmailInput
                email={emailForm.watch('email')}
                password={emailForm.watch('password')}
                confirmPassword={emailForm.watch('confirmPassword')}
                onEmailChange={(value) => emailForm.setValue('email', value)}
                onPasswordChange={(value) => emailForm.setValue('password', value)}
                onConfirmPasswordChange={(value) => emailForm.setValue('confirmPassword', value)}
                emailError={emailForm.formState.errors.email?.message}
                passwordError={emailForm.formState.errors.password?.message}
                confirmPasswordError={emailForm.formState.errors.confirmPassword?.message}
                isRegister={true}
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
                  disabled={
                    !emailForm.watch('email') || 
                    !emailForm.watch('password') || 
                    !emailForm.watch('confirmPassword')
                  }
                >
                  {loading ? '注册中...' : '注册'}
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
                  <p className="text-sm text-red-800 font-medium">注册失败</p>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-gray-600 text-sm">
              已有账户？
              <Link
                href="/login"
                className="text-blue-600 hover:text-blue-700 font-medium ml-1 hover:underline"
              >
                立即登录
              </Link>
            </p>
          </div>

          {/* Terms */}
          <div className="mt-6 pt-6 border-t border-gray-100">
            <div className="text-center">
              <p className="text-xs text-gray-500">
                注册即表示您同意我们的{' '}
                <button className="text-blue-600 hover:underline">服务条款</button> 和{' '}
                <button className="text-blue-600 hover:underline">隐私政策</button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}