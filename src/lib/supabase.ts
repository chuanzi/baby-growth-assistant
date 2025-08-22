import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// 在运行时检查环境变量，而不是在构建时
function getSupabaseUrl(): string {
  if (!supabaseUrl) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
    return ''
  }
  return supabaseUrl
}

function getSupabaseAnonKey(): string {
  if (!supabaseAnonKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable')
    return ''
  }
  return supabaseAnonKey
}

// 创建Supabase客户端（用于客户端）
export const supabase = createClient<Database>(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder-key', 
  {
    auth: {
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'pkce'
    }
  }
)

// 服务端使用的客户端创建函数（用于API路由）
export function createSupabaseAdmin() {
  if (typeof window !== 'undefined') {
    throw new Error('supabaseAdmin should only be used on the server side')
  }
  
  const adminUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!adminUrl || !adminKey) {
    console.error('Missing Supabase admin environment variables')
    // 返回一个占位符客户端，避免构建失败
    return createClient<Database>('https://placeholder.supabase.co', 'placeholder-key')
  }
  
  return createClient<Database>(adminUrl, adminKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

// 运行时检查函数
export function isSupabaseConfigured(): boolean {
  return !!(supabaseUrl && supabaseAnonKey && supabaseUrl !== 'https://placeholder.supabase.co')
}