'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/Button';
import { PhoneInput } from '@/components/forms/PhoneInput';
import { EmailInput } from '@/components/forms/EmailInput';
import { AuthMethodSelector, type AuthMethod } from '@/components/forms/AuthMethodSelector';
import { 
  phoneRegisterSchema, 
  emailRegisterSchema,
  type PhoneRegisterFormData, 
  type EmailRegisterFormData 
} from '@/lib/validations';

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [error, setError] = useState('');
  const [authMethod, setAuthMethod] = useState<AuthMethod>('email'); // 默认邮箱注册
  const router = useRouter();
  const { login } = useAuth();

  // 手机注册表单
  const phoneForm = useForm<PhoneRegisterFormData>({
    resolver: zodResolver(phoneRegisterSchema),
    defaultValues: {
      phone: '',
      verificationCode: '',
    },
  });

  // 邮箱注册表单
  const emailForm = useForm<EmailRegisterFormData>({
    resolver: zodResolver(emailRegisterSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
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
        body: JSON.stringify({ phone, type: 'register' }),
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

  const onPhoneSubmit = async (data: PhoneRegisterFormData) => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...data, method: 'phone' }),
      });

      if (response.ok) {
        const result = await response.json();
        // 调用login来更新认证状态
        login(result.user);
        router.push('/create-profile');
      } else {
        const result = await response.json();
        setError(result.error || '注册失败');
      }
    } catch {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const onEmailSubmit = async (data: EmailRegisterFormData) => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...data, method: 'email' }),
      });

      if (response.ok) {
        const result = await response.json();
        // 调用login来更新认证状态
        login(result.user);
        router.push('/create-profile');
      } else {
        const result = await response.json();
        setError(result.error || '注册失败');
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
            <h2 className="text-lg font-semibold text-gray-700 mb-2">创建账户</h2>
            <p className="text-gray-600 text-sm">选择注册方式，开始记录宝宝成长</p>
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
                {loading ? '注册中...' : '创建账户'}
              </Button>
            </form>
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

              <Button
                type="submit"
                className="w-full h-12 text-base font-medium"
                loading={loading}
                disabled={!emailForm.watch('email') || !emailForm.watch('password') || !emailForm.watch('confirmPassword')}
              >
                {loading ? '注册中...' : '创建账户'}
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
                  <p className="text-sm text-red-800 font-medium">注册失败</p>
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

          {/* Security notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
            <div className="flex items-start gap-3">
              <div className="text-blue-600 text-xl flex-shrink-0">🛡️</div>
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">安全承诺</p>
                <ul className="text-xs space-y-1 text-blue-700">
                  <li>• 所有数据加密传输和存储</li>
                  <li>• 严格遵循数据保护法规</li>
                  <li>• 专为早产儿家庭设计</li>
                </ul>
              </div>
            </div>
          </div>

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
          <div className="mt-6 pt-6 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-500">
              注册即表示同意我们的{' '}
              <button className="text-blue-600 hover:underline">服务条款</button> 和{' '}
              <button className="text-blue-600 hover:underline">隐私政策</button>
            </p>
          </div>
        </div>

        {/* Features preview */}
        <div className="mt-6 grid grid-cols-3 gap-3 text-center">
          <div className="bg-white/80 backdrop-blur-sm rounded-lg p-3">
            <div className="text-2xl mb-1">📊</div>
            <div className="text-xs text-gray-700 font-medium">成长追踪</div>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-lg p-3">
            <div className="text-2xl mb-1">🎯</div>
            <div className="text-xs text-gray-700 font-medium">里程碑</div>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-lg p-3">
            <div className="text-2xl mb-1">🤖</div>
            <div className="text-xs text-gray-700 font-medium">AI指导</div>
          </div>
        </div>
      </div>
    </div>
  );
}