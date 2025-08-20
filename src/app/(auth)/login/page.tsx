'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { PhoneInput } from '@/components/forms/PhoneInput';
import { loginSchema, type LoginFormData } from '@/lib/validations';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const {
    watch,
    setValue,
    formState: { errors },
    handleSubmit,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      phone: '',
      verificationCode: '',
    },
  });

  const phone = watch('phone');
  const verificationCode = watch('verificationCode');

  const handleSendCode = async () => {
    setLoading(true);
    setError('');

    try {
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

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
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

  return (
    <div>
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">欢迎回来</h2>
        <p className="text-gray-600">请输入手机号登录您的账户</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <PhoneInput
          phone={phone}
          verificationCode={verificationCode}
          onPhoneChange={(value) => setValue('phone', value)}
          onVerificationCodeChange={(value) => setValue('verificationCode', value)}
          onSendCode={handleSendCode}
          phoneError={errors.phone?.message}
          codeError={errors.verificationCode?.message}
          loading={loading}
          codeSent={codeSent}
        />

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <Button
          type="submit"
          className="w-full"
          loading={loading}
          disabled={!codeSent || !verificationCode}
        >
          登录
        </Button>
      </form>

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