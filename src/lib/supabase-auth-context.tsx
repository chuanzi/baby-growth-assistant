'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { User as SupabaseUser, AuthError } from '@supabase/supabase-js';
import type { Baby } from '@/types';

interface AuthUser extends SupabaseUser {
  babies: Baby[];
}

interface AuthContextType {
  user: AuthUser | null;
  supabaseUser: SupabaseUser | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<{ error?: AuthError }>;
  signUpWithEmail: (email: string, password: string) => Promise<{ error?: AuthError }>;
  signOut: () => Promise<void>;
  updateUserData: (userData: Partial<AuthUser>) => void;
}

const SupabaseAuthContext = createContext<AuthContextType | undefined>(undefined);

interface SupabaseAuthProviderProps {
  children: ReactNode;
}

export function SupabaseAuthProvider({ children }: SupabaseAuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // 监听认证状态变化
  useEffect(() => {
    // 检查 Supabase 是否配置
    if (!isSupabaseConfigured()) {
      console.warn('Supabase is not configured, skipping auth initialization');
      setLoading(false);
      return;
    }

    // 获取初始会话
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          setSupabaseUser(session.user);
          await loadUserData(session.user);
        }
      } catch (error) {
        console.error('Failed to get initial session:', error);
      }
      
      setLoading(false);
    };

    getInitialSession();

    // 监听认证状态变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event);
        
        if (event === 'SIGNED_IN' && session?.user) {
          setSupabaseUser(session.user);
          await loadUserData(session.user);
        } else if (event === 'SIGNED_OUT') {
          setSupabaseUser(null);
          setUser(null);
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          setSupabaseUser(session.user);
        }
        
        setLoading(false);
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // 加载用户数据（包括宝宝信息）
  const loadUserData = async (supabaseUser: SupabaseUser) => {
    try {
      // 先设置基本用户信息，避免阻塞
      setUser({ ...supabaseUser, babies: [] } as AuthUser);
      
      // 异步加载宝宝信息
      const session = await supabase.auth.getSession();
      if (session.data.session?.access_token) {
        const response = await fetch('/api/babies', {
          headers: {
            'Authorization': `Bearer ${session.data.session.access_token}`
          }
        });
        
        if (response.ok) {
          const babies = await response.json();
          setUser(prevUser => prevUser ? { ...prevUser, babies } : null);
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      // 确保用户状态已设置，即使宝宝数据加载失败
      setUser({ ...supabaseUser, babies: [] } as AuthUser);
    }
  };

  // Google 登录
  const signInWithGoogle = async () => {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured');
    }

    // 获取当前环境的URL
    const baseUrl = typeof window !== 'undefined' 
      ? window.location.origin 
      : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${baseUrl}/dashboard`
      }
    });
    
    if (error) {
      console.error('Google sign in error:', error);
      throw error;
    }
  };

  // 邮箱登录
  const signInWithEmail = async (email: string, password: string) => {
    if (!isSupabaseConfigured()) {
      return { error: { message: 'Supabase is not configured' } as AuthError };
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    return { error };
  };

  // 邮箱注册
  const signUpWithEmail = async (email: string, password: string) => {
    if (!isSupabaseConfigured()) {
      return { error: { message: 'Supabase is not configured' } as AuthError };
    }

    const baseUrl = typeof window !== 'undefined' 
      ? window.location.origin 
      : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${baseUrl}/dashboard`
      }
    });
    
    return { error };
  };

  // 退出登录
  const signOut = async () => {
    if (!isSupabaseConfigured()) {
      setUser(null);
      setSupabaseUser(null);
      router.push('/login');
      return;
    }

    const { error } = await supabase.auth.signOut();
    
    if (!error) {
      setUser(null);
      setSupabaseUser(null);
      router.push('/login');
    }
  };

  // 更新用户数据（本地状态）
  const updateUserData = (userData: Partial<AuthUser>) => {
    if (user) {
      setUser({ ...user, ...userData });
    }
  };

  return (
    <SupabaseAuthContext.Provider value={{
      user,
      supabaseUser,
      loading,
      signInWithGoogle,
      signInWithEmail,
      signUpWithEmail,
      signOut,
      updateUserData
    }}>
      {children}
    </SupabaseAuthContext.Provider>
  );
}

export function useSupabaseAuth() {
  const context = useContext(SupabaseAuthContext);
  if (context === undefined) {
    throw new Error('useSupabaseAuth must be used within a SupabaseAuthProvider');
  }
  return context;
}

// 路由保护Hook
export function useSupabaseRequireAuth() {
  const { user, loading } = useSupabaseAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  return { user, loading };
}