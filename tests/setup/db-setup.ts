import { PrismaClient } from '@prisma/client'

// 测试数据库设置
let prisma: PrismaClient

export function setupTestDatabase() {
  // 创建测试专用的Prisma实例
  prisma = new PrismaClient({
    datasources: {
      db: {
        url: 'file:./test.db',
      },
    },
    log: ['error'], // 只记录错误日志
  })

  return prisma
}

export async function cleanupTestDatabase() {
  if (prisma) {
    // 清理所有测试数据，按照外键依赖顺序删除
    await prisma.babyMilestone.deleteMany()
    await prisma.sleepRecord.deleteMany()
    await prisma.feedingRecord.deleteMany()
    await prisma.baby.deleteMany()
    await prisma.user.deleteMany()
    await prisma.milestone.deleteMany()
    
    await prisma.$disconnect()
  }
}

export function getTestDatabase() {
  return prisma
}

// 创建测试数据的工厂函数
export async function createTestUser(data: {
  phone?: string
  email?: string
  password?: string
}) {
  return prisma.user.create({
    data: {
      phone: data.phone || `1380000${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
      email: data.email,
      password: data.password,
    },
  })
}

export async function createTestBaby(userId: string, data?: {
  name?: string
  birthDate?: Date
  gestationalWeeks?: number
  gestationalDays?: number
}) {
  return prisma.baby.create({
    data: {
      userId,
      name: data?.name || '测试宝宝',
      birthDate: data?.birthDate || new Date('2023-10-01'),
      gestationalWeeks: data?.gestationalWeeks || 32,
      gestationalDays: data?.gestationalDays || 0,
    },
  })
}

export async function createTestMilestone(data: {
  ageRangeMin: number
  ageRangeMax: number
  title: string
  description: string
  category: string
}) {
  return prisma.milestone.create({
    data,
  })
}

export async function createTestFeedingRecord(babyId: string, data?: {
  type?: string
  amountOrDuration?: string
  timestamp?: Date
  notes?: string
}) {
  return prisma.feedingRecord.create({
    data: {
      babyId,
      type: data?.type || 'formula',
      amountOrDuration: data?.amountOrDuration || '120ml',
      timestamp: data?.timestamp || new Date(),
      notes: data?.notes,
    },
  })
}

export async function createTestSleepRecord(babyId: string, data?: {
  startTime?: Date
  endTime?: Date
  notes?: string
}) {
  const startTime = data?.startTime || new Date('2024-01-15T10:00:00Z')
  const endTime = data?.endTime || new Date('2024-01-15T12:00:00Z')
  const durationMinutes = Math.floor((endTime.getTime() - startTime.getTime()) / (1000 * 60))

  return prisma.sleepRecord.create({
    data: {
      babyId,
      startTime,
      endTime,
      durationMinutes,
      notes: data?.notes,
    },
  })
}

// 初始化测试里程碑数据
export async function seedTestMilestones() {
  const milestones = [
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

  const createdMilestones = []
  for (const milestone of milestones) {
    const created = await createTestMilestone(milestone)
    createdMilestones.push(created)
  }
  
  return createdMilestones
}

// 全局测试数据库hooks
beforeAll(async () => {
  global.testDb = setupTestDatabase()
})

afterAll(async () => {
  await cleanupTestDatabase()
})

beforeEach(async () => {
  // 每个测试前清理数据库
  await cleanupTestDatabase()
  global.testDb = setupTestDatabase()
})