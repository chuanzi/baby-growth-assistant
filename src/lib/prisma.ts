import { PrismaClient } from '@prisma/client'
import { demoDb } from './demo-db'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// 检查是否在Vercel环境中且数据库URL使用临时文件
const isVercelDemo = process.env.VERCEL && process.env.DATABASE_URL?.includes('/tmp/')

export const prisma = isVercelDemo 
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ? (demoDb as any) // 在Vercel演示环境中使用内存数据库
  : (globalForPrisma.prisma ??
    new PrismaClient({
      log: ['query'],
    }))

if (process.env.NODE_ENV !== 'production' && !isVercelDemo) {
  globalForPrisma.prisma = prisma as PrismaClient
}