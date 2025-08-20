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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
    <div>
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">欢迎回来</h2>
        <p className="text-gray-600">请选择登录方式</p>
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
            className="w-full"
            loading={loading}
            disabled={!codeSent || !phoneForm.watch('verificationCode')}
          >
            登录
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
            className="w-full"
            loading={loading}
            disabled={!emailForm.watch('email') || !emailForm.watch('password')}
          >
            登录
          </Button>
        </form>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mt-4">
          {error}
        </div>
      )}

      <div className="mt-6 text-center">
        <p className="text-gray-600">
          还没有账户？
          <Link
            href="/register"
            className="text-blue-600 hover:text-blue-700 font-medium ml-1"
          >
            立即注册
          </Link>
        </p>
      </div>
    </div>
  );
}