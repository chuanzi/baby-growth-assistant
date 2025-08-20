import { clsx } from 'clsx';

export type AuthMethod = 'phone' | 'email';

interface AuthMethodSelectorProps {
  selectedMethod: AuthMethod;
  onMethodChange: (method: AuthMethod) => void;
  className?: string;
}

export function AuthMethodSelector({ 
  selectedMethod, 
  onMethodChange, 
  className 
}: AuthMethodSelectorProps) {
  const methods = [
    { 
      value: 'phone' as const, 
      label: '手机号登录', 
      icon: '📱',
      description: '使用手机号和验证码'
    },
    { 
      value: 'email' as const, 
      label: '邮箱登录', 
      icon: '📧',
      description: '使用邮箱和密码'
    },
  ];

  return (
    <div className={clsx('space-y-3', className)}>
      <div className="text-center mb-4">
        <h3 className="text-sm font-medium text-gray-700 mb-2">选择登录方式</h3>
      </div>
      <div className="grid grid-cols-1 gap-3">
        {methods.map((method) => (
          <button
            key={method.value}
            type="button"
            onClick={() => onMethodChange(method.value)}
            className={clsx(
              'relative w-full p-4 text-left border-2 rounded-lg transition-all duration-200',
              selectedMethod === method.value
                ? 'border-blue-500 bg-blue-50 shadow-md'
                : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
            )}
          >
            <div className="flex items-center space-x-3">
              <div className="text-2xl">{method.icon}</div>
              <div className="flex-1">
                <div className="font-medium text-gray-800">
                  {method.label}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  {method.description}
                </div>
              </div>
              {selectedMethod === method.value && (
                <div className="text-blue-500">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}