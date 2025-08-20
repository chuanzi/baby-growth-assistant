import { useState } from 'react';
import { Input } from '@/components/ui/Input';

interface EmailInputProps {
  email: string;
  password: string;
  confirmPassword?: string; // 用于注册
  onEmailChange: (email: string) => void;
  onPasswordChange: (password: string) => void;
  onConfirmPasswordChange?: (confirmPassword: string) => void;
  emailError?: string;
  passwordError?: string;
  confirmPasswordError?: string;
  isRegister?: boolean;
}

export function EmailInput({
  email,
  password,
  confirmPassword = '',
  onEmailChange,
  onPasswordChange,
  onConfirmPasswordChange,
  emailError,
  passwordError,
  confirmPasswordError,
  isRegister = false,
}: EmailInputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  return (
    <div className="space-y-4">
      {/* 邮箱输入 */}
      <Input
        type="email"
        label="邮箱地址"
        placeholder="请输入邮箱地址"
        value={email}
        onChange={(e) => onEmailChange(e.target.value)}
        error={emailError}
        autoComplete="email"
      />

      {/* 密码输入 */}
      <div className="relative">
        <Input
          type={showPassword ? "text" : "password"}
          label="密码"
          placeholder={isRegister ? "请输入密码（8位以上，包含大小写字母和数字）" : "请输入密码"}
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
          error={passwordError}
          autoComplete={isRegister ? "new-password" : "current-password"}
          className="pr-12"
        />
        <button
          type="button"
          className="absolute right-3 top-8 h-6 w-6 text-gray-400 hover:text-gray-600"
          onClick={() => setShowPassword(!showPassword)}
        >
          {showPassword ? (
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L5.64 5.64m4.238 4.238L15.12 15.12M15.12 15.12L19.36 19.36" />
            </svg>
          ) : (
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          )}
        </button>
      </div>

      {/* 确认密码输入 - 仅注册时显示 */}
      {isRegister && onConfirmPasswordChange && (
        <div className="relative animate-in slide-in-from-top duration-200">
          <Input
            type={showConfirmPassword ? "text" : "password"}
            label="确认密码"
            placeholder="请再次输入密码"
            value={confirmPassword}
            onChange={(e) => onConfirmPasswordChange(e.target.value)}
            error={confirmPasswordError}
            autoComplete="new-password"
            className="pr-12"
          />
          <button
            type="button"
            className="absolute right-3 top-8 h-6 w-6 text-gray-400 hover:text-gray-600"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
          >
            {showConfirmPassword ? (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L5.64 5.64m4.238 4.238L15.12 15.12M15.12 15.12L19.36 19.36" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        </div>
      )}

      {/* 密码强度提示 - 仅注册时显示 */}
      {isRegister && (
        <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
          <p className="font-medium mb-1">密码要求：</p>
          <ul className="space-y-1 text-xs">
            <li className="flex items-center space-x-2">
              <span className={password.length >= 8 ? "text-green-500" : "text-gray-400"}>✓</span>
              <span>至少8位字符</span>
            </li>
            <li className="flex items-center space-x-2">
              <span className={/[a-z]/.test(password) ? "text-green-500" : "text-gray-400"}>✓</span>
              <span>包含小写字母</span>
            </li>
            <li className="flex items-center space-x-2">
              <span className={/[A-Z]/.test(password) ? "text-green-500" : "text-gray-400"}>✓</span>
              <span>包含大写字母</span>
            </li>
            <li className="flex items-center space-x-2">
              <span className={/\d/.test(password) ? "text-green-500" : "text-gray-400"}>✓</span>
              <span>包含数字</span>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}