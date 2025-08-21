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
    <div>
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">创建账户</h2>
        <p className="text-gray-600">请选择注册方式</p>
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
            注册
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
            className="w-full"
            loading={loading}
            disabled={!emailForm.watch('email') || !emailForm.watch('password') || !emailForm.watch('confirmPassword')}
          >
            注册
          </Button>
        </form>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mt-4">
          {error}
        </div>
      )}

      <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg mt-4">
        <p>📱 注册即表示您同意我们的服务条款和隐私政策</p>
        <p className="mt-1">🔒 您的信息将被安全保护</p>
      </div>

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