'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { PhoneInput } from '@/components/forms/PhoneInput';
import { EmailInput } from '@/components/forms/EmailInput';
import { AuthMethodSelector, type AuthMethod } from '@/components/forms/AuthMethodSelector';
import { 
  phoneLoginSchema, 
  emailLoginSchema,
  type PhoneLoginFormData, 
  type EmailLoginFormData 
} from '@/lib/validations';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [error, setError] = useState('');
  const [authMethod, setAuthMethod] = useState<AuthMethod>('phone');
  const router = useRouter();

  // 手机登录表单
  const phoneForm = useForm<PhoneLoginFormData>({
    resolver: zodResolver(phoneLoginSchema),
    defaultValues: {
      phone: '',
      verificationCode: '',
    },
  });

  // 邮箱登录表单
  const emailForm = useForm<EmailLoginFormData>({
    resolver: zodResolver(emailLoginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const handleSendCode = async () => {
    setLoading(true);
    setError('');

    try {
      const phone = phoneForm.watch('phone');
      const response = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone, type: 'login' }),
      });

      if (response.ok) {
        setCodeSent(true);
      } else {
        const data = await response.json();
        setError(data.error || '发送验证码失败');
      }
    } catch {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const onPhoneSubmit = async (data: PhoneLoginFormData) => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...data, method: 'phone' }),
      });

      if (response.ok) {
        router.push('/dashboard');
      } else {
        const result = await response.json();
        setError(result.error || '登录失败');
      }
    } catch {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const onEmailSubmit = async (data: EmailLoginFormData) => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...data, method: 'email' }),
      });

      if (response.ok) {
        router.push('/dashboard');
      } else {
        const result = await response.json();
        setError(result.error || '登录失败');
      }
    } catch {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleMethodChange = (method: AuthMethod) => {
    setAuthMethod(method);
    setError('');
    setCodeSent(false);
    // 重置表单
    phoneForm.reset();
    emailForm.reset();
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

          <AuthMethodSelector 
            selectedMethod={authMethod}
            onMethodChange={handleMethodChange}
            className="mb-6"
          />

          {authMethod === 'phone' ? (
            <form onSubmit={phoneForm.handleSubmit(onPhoneSubmit)} className="space-y-6">
              <PhoneInput
                phone={phoneForm.watch('phone')}
                verificationCode={phoneForm.watch('verificationCode')}
                onPhoneChange={(value) => phoneForm.setValue('phone', value)}
                onVerificationCodeChange={(value) => phoneForm.setValue('verificationCode', value)}
                onSendCode={handleSendCode}
                phoneError={phoneForm.formState.errors.phone?.message}
                codeError={phoneForm.formState.errors.verificationCode?.message}
                loading={loading}
                codeSent={codeSent}
              />

              <Button
                type="submit"
                className="w-full h-12 text-base font-medium"
                loading={loading}
                disabled={!codeSent || !phoneForm.watch('verificationCode')}
              >
                {loading ? '登录中...' : '登录'}
              </Button>
            </form>
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

              <Button
                type="submit"
                className="w-full h-12 text-base font-medium"
                loading={loading}
                disabled={!emailForm.watch('email') || !emailForm.watch('password')}
              >
                {loading ? '登录中...' : '登录'}
              </Button>
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

          {/* Success feedback for code sent */}
          {codeSent && !error && (
            <div className="bg-green-50 border-l-4 border-green-400 p-4 mt-6 rounded-r-lg">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-green-800 font-medium">验证码已发送</p>
                  <p className="text-sm text-green-700">请查看短信并输入验证码</p>
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