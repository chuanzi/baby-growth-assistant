import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface PhoneInputProps {
  phone: string;
  verificationCode: string;
  onPhoneChange: (phone: string) => void;
  onVerificationCodeChange: (code: string) => void;
  onSendCode: () => void;
  phoneError?: string;
  codeError?: string;
  loading?: boolean;
  codeSent?: boolean;
}

export function PhoneInput({
  phone,
  verificationCode,
  onPhoneChange,
  onVerificationCodeChange,
  onSendCode,
  phoneError,
  codeError,
  loading = false,
  codeSent = false
}: PhoneInputProps) {
  const [countdown, setCountdown] = useState(0);

  const handleSendCode = async () => {
    if (countdown > 0) return;
    
    await onSendCode();
    
    // 开始倒计时
    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const isPhoneValid = /^1[3-9]\d{9}$/.test(phone);

  return (
    <div className="space-y-4">
      {/* 手机号输入 */}
      <div className="relative">
        <Input
          type="tel"
          label="手机号"
          placeholder="请输入手机号"
          value={phone}
          onChange={(e) => onPhoneChange(e.target.value)}
          error={phoneError}
          className="pr-20"
        />
        <div className="absolute right-2 top-8 flex items-center">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSendCode}
            disabled={!isPhoneValid || countdown > 0 || loading}
            className="h-8"
          >
            {countdown > 0 ? `${countdown}s` : codeSent ? '重新发送' : '发送验证码'}
          </Button>
        </div>
      </div>

      {/* 验证码输入 */}
      {codeSent && (
        <div className="animate-in slide-in-from-top duration-200">
          <Input
            type="text"
            label="验证码"
            placeholder="请输入验证码"
            value={verificationCode}
            onChange={(e) => onVerificationCodeChange(e.target.value.replace(/\D/g, ''))}
            error={codeError}
            maxLength={6}
          />
          <p className="text-sm text-gray-500 mt-1">
            验证码已发送至 {phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')}
          </p>
        </div>
      )}
    </div>
  );
}