import { FullConfig } from '@playwright/test'
import { PrismaClient } from '@prisma/client'
import fs from 'fs/promises'
import path from 'path'

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Cleaning up E2E test environment...')

  // 清理测试数据库
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: 'file:./e2e-test.db',
      },
    },
  })

  try {
    await prisma.babyMilestone.deleteMany()
    await prisma.sleepRecord.deleteMany()
    await prisma.feedingRecord.deleteMany()
    await prisma.baby.deleteMany()
    await prisma.user.deleteMany()
    await prisma.milestone.deleteMany()
    
    console.log('✅ Test data cleaned up')
  } catch (error) {
    console.warn('⚠️  Database cleanup failed:', error)
  } finally {
    await prisma.$disconnect()
  }

  // 删除测试数据库文件
  try {
    await fs.unlink(path.join(process.cwd(), 'e2e-test.db'))
    console.log('✅ Test database file deleted')
  } catch (error) {
    // 文件可能不存在，这是正常的
    console.log('ℹ️  Test database file not found (this is normal)')
  }

  // 清理环境变量
  delete process.env.E2E_TEST_USER_ID
  delete process.env.E2E_TEST_USER_PHONE
  delete process.env.E2E_TEST_USER_EMAIL
  delete process.env.E2E_TEST_BABY_ID
  delete process.env.E2E_TEST_BABY_NAME

  console.log('✅ E2E test environment cleanup completed')
}

export default globalTeardown