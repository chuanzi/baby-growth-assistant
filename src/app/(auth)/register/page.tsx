'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { PhoneInput } from '@/components/forms/PhoneInput';
import { registerSchema, type RegisterFormData } from '@/lib/validations';

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const {
    watch,
    setValue,
    formState: { errors },
    handleSubmit,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
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
        body: JSON.stringify({ phone, type: 'register' }),
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

  const onSubmit = async (data: RegisterFormData) => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        // 注册成功，跳转到宝宝档案创建页面
        router.push('/create-profile');
      } else {
        const result = await response.json();
        setError(result.error || '注册失败');
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
        <h2 className="text-2xl font-bold text-gray-800 mb-2">创建账户</h2>
        <p className="text-gray-600">请输入手机号注册新账户</p>
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

        <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
          <p>📱 注册即表示您同意我们的服务条款和隐私政策</p>
          <p className="mt-1">🔒 您的信息将被安全保护</p>
        </div>

        <Button
          type="submit"
          className="w-full"
          loading={loading}
          disabled={!codeSent || !verificationCode}
        >
          注册
        </Button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-gray-600">
          已有账户？
          <Link
            href="/login"
            className="text-blue-600 hover:text-blue-700 font-medium ml-1"
          >
            立即登录
          </Link>
        </p>
      </div>
    </div>
  );
}