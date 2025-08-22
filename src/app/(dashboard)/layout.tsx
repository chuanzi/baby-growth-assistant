'use client';

import { useSupabaseAuth } from '@/lib/supabase-auth-context';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { TopBar } from '@/components/navigation/TopBar';
import { MobileNav } from '@/components/navigation/MobileNav';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, loading } = useSupabaseAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (!loading && !user && !redirecting) {
      console.log('User not authenticated, redirecting to login');
      setRedirecting(true);
      router.replace('/login');
    }
  }, [user, loading, router, redirecting]);

  // 显示加载状态
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>认证检查中...</p>
        </div>
      </div>
    );
  }

  // 如果正在重定向或用户未认证，显示重定向状态
  if (!user || redirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
          <p>未认证，正在重定向...</p>
        </div>
      </div>
    );
  }

  // 用户已认证，显示正常布局
  return (
    <div className="min-h-screen bg-gray-50">
      <TopBar />
      <main className="pb-4">
        {children}
      </main>
      <MobileNav />
    </div>
  );
}