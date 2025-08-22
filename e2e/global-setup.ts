import { chromium, FullConfig } from '@playwright/test'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

async function globalSetup(config: FullConfig) {
  console.log('🚀 Setting up E2E test environment...')

  // 设置测试数据库
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: 'file:./e2e-test.db',
      },
    },
  })

  try {
    // 清理现有数据
    await prisma.babyMilestone.deleteMany()
    await prisma.sleepRecord.deleteMany()
    await prisma.feedingRecord.deleteMany()
    await prisma.baby.deleteMany()
    await prisma.user.deleteMany()
    await prisma.milestone.deleteMany()

    // 创建测试用户
    const testUsers = [
      {
        phone: '13800138000',
        email: 'test@example.com',
        password: await bcrypt.hash('Password123', 12),
      },
      {
        phone: '13800138001',
        email: 'user2@example.com', 
        password: await bcrypt.hash('Password123', 12),
      }
    ]

    const createdUsers = []
    for (const userData of testUsers) {
      const user = await prisma.user.create({
        data: userData,
      })
      createdUsers.push(user)
    }

    // 为第一个用户创建测试宝宝
    const testBabies = [
      {
        userId: createdUsers[0].id,
        name: '测试宝宝',
        birthDate: new Date('2023-10-15'),
        gestationalWeeks: 36,
        gestationalDays: 3,
      },
      {
        userId: createdUsers[0].id,
        name: '二宝',
        birthDate: new Date('2023-08-01'),
        gestationalWeeks: 32,
        gestationalDays: 0,
      }
    ]

    const createdBabies = []
    for (const babyData of testBabies) {
      const baby = await prisma.baby.create({
        data: babyData,
      })
      createdBabies.push(baby)
    }

    // 创建测试里程碑
    const testMilestones = [
      {
        ageRangeMin: 0,
        ageRangeMax: 30,
        title: '能够举起头部几秒钟',
        description: '俯卧时能够短暂抬起头部',
        category: 'motor',
      },
      {
        ageRangeMin: 0,
        ageRangeMax: 60,
        title: '对声音有反应',
        description: '听到响声时会转头或眨眼',
        category: 'cognitive',
      },
      {
        ageRangeMin: 30,
        ageRangeMax: 90,
        title: '能够保持头部稳定',
        description: '坐着时头部能够保持稳定',
        category: 'motor',
      },
      {
        ageRangeMin: 60,
        ageRangeMax: 120,
        title: '开始发出"咕咕"声',
        description: '开始主动发声与人交流',
        category: 'language',
      },
    ]

    for (const milestoneData of testMilestones) {
      await prisma.milestone.create({
        data: milestoneData,
      })
    }

    // 为第一个宝宝创建一些测试记录
    const baby = createdBabies[0]
    
    // 创建喂养记录
    await prisma.feedingRecord.create({
      data: {
        babyId: baby.id,
        type: 'formula',
        amountOrDuration: '120ml',
        timestamp: new Date('2024-01-15T10:00:00Z'),
        notes: '宝宝喝得很好',
      },
    })

    await prisma.feedingRecord.create({
      data: {
        babyId: baby.id,
        type: 'breast',
        amountOrDuration: '15分钟',
        timestamp: new Date('2024-01-15T14:00:00Z'),
      },
    })

    // 创建睡眠记录
    await prisma.sleepRecord.create({
      data: {
        babyId: baby.id,
        startTime: new Date('2024-01-15T13:00:00Z'),
        endTime: new Date('2024-01-15T15:00:00Z'),
        durationMinutes: 120,
        notes: '午睡很安稳',
      },
    })

    console.log('✅ E2E test data setup completed')
    console.log(`   - Created ${createdUsers.length} test users`)
    console.log(`   - Created ${createdBabies.length} test babies`)
    console.log(`   - Created ${testMilestones.length} test milestones`)

    // 保存测试数据引用到全局状态
    process.env.E2E_TEST_USER_ID = createdUsers[0].id
    process.env.E2E_TEST_USER_PHONE = createdUsers[0].phone
    process.env.E2E_TEST_USER_EMAIL = createdUsers[0].email
    process.env.E2E_TEST_BABY_ID = createdBabies[0].id
    process.env.E2E_TEST_BABY_NAME = createdBabies[0].name

  } catch (error) {
    console.error('❌ E2E test setup failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }

  // 预热应用程序
  console.log('🔥 Warming up application...')
  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()
  
  try {
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000) // 给应用程序一些时间来初始化
    console.log('✅ Application warmed up successfully')
  } catch (error) {
    console.warn('⚠️  Application warmup failed, continuing anyway:', error)
  } finally {
    await context.close()
    await browser.close()
  }
}

export default globalSetup