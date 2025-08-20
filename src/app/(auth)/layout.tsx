import { ReactNode } from 'react';

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-blue-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            宝宝成长助手
          </h1>
          <p className="text-gray-600">
            专业的早产儿成长跟踪平台
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6 md:p-8">
          {children}
        </div>
      </div>
    </div>
  );
}