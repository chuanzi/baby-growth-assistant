'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/Button';

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p>加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                欢迎使用宝宝成长助手！
              </h1>
              <p className="text-gray-600 mt-1">
                {user.phone ? `手机号：${user.phone}` : `邮箱：${user.email}`}
              </p>
            </div>
            <Button variant="outline" onClick={logout}>
              退出登录
            </Button>
          </div>

          {user.babies.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">👶</div>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">
                还没有宝宝档案
              </h2>
              <p className="text-gray-600 mb-6">
                创建宝宝档案，开始记录成长的每一刻
              </p>
              <Button onClick={() => router.push('/create-profile')}>
                创建宝宝档案
              </Button>
            </div>
          ) : (
            <div>
              <h2 className="text-lg font-semibold mb-4">我的宝宝</h2>
              <div className="grid gap-4">
                {user.babies.map((baby) => (
                  <div key={baby.id} className="border rounded-lg p-4">
                    <h3 className="font-medium">{baby.name}</h3>
                    <p className="text-sm text-gray-600">
                      出生日期：{new Date(baby.birthDate).toLocaleDateString('zh-CN')}
                    </p>
                    <p className="text-sm text-gray-600">
                      出生孕周：{baby.gestationalWeeks}周{baby.gestationalDays > 0 ? `+${baby.gestationalDays}天` : ''}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}