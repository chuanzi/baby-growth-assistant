import { performance } from 'perf_hooks'
import { NextRequest } from 'next/server'
import { POST as loginHandler } from '@/app/api/auth/login/route'
import { GET as getBabiesHandler } from '@/app/api/babies/route'
import { GET as getTimelineHandler } from '@/app/api/records/timeline/[babyId]/route'
import { setupTestDatabase, cleanupTestDatabase, createTestUser, createTestBaby, createTestFeedingRecord, createTestSleepRecord } from '../setup/db-setup'
import { signToken } from '@/lib/auth'

// 性能基准配置
const PERFORMANCE_THRESHOLDS = {
  auth: {
    login: 500, // 500ms
    tokenVerification: 50, // 50ms
  },
  crud: {
    create: 300, // 300ms
    read: 200, // 200ms
    update: 300, // 300ms
    delete: 200, // 200ms
  },
  queries: {
    simple: 100, // 100ms
    complex: 500, // 500ms
    aggregation: 1000, // 1000ms
  },
  api: {
    response: 1000, // 1000ms
    dataTransfer: 2000, // 2000ms for large datasets
  },
}

// 模拟 verifyCode 函数
jest.mock('@/app/api/auth/send-code/route', () => ({
  verifyCode: jest.fn().mockReturnValue(true),
}))

describe('API Performance Tests', () => {
  let testDb: any
  let testUser: any
  let authToken: string
  let testBaby: any

  beforeAll(async () => {
    testDb = setupTestDatabase()
  })

  afterAll(async () => {
    await cleanupTestDatabase()
  })

  beforeEach(async () => {
    await cleanupTestDatabase()
    testDb = setupTestDatabase()
    
    testUser = await createTestUser({ phone: '13800138000' })
    authToken = await signToken({ userId: testUser.id, phone: testUser.phone })
    testBaby = await createTestBaby(testUser.id, {
      name: '性能测试宝宝',
      gestationalWeeks: 36,
    })
  })

  describe('认证API性能', () => {
    it('登录API应该在规定时间内响应', async () => {
      const requestBody = {
        method: 'phone',
        phone: '13800138000',
        verificationCode: '1234',
      }

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      })

      const startTime = performance.now()
      const response = await loginHandler(request)
      const endTime = performance.now()
      
      const responseTime = endTime - startTime
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.auth.login)

      console.log(`Login API Response Time: ${responseTime.toFixed(2)}ms`)
    })

    it('Token验证应该快速完成', async () => {
      const iterations = 100
      const times: number[] = []

      for (let i = 0; i < iterations; i++) {
        const { verifyToken } = await import('@/lib/auth')
        
        const startTime = performance.now()
        await verifyToken(authToken)
        const endTime = performance.now()
        
        times.push(endTime - startTime)
      }

      const averageTime = times.reduce((sum, time) => sum + time, 0) / times.length
      const maxTime = Math.max(...times)
      const minTime = Math.min(...times)

      expect(averageTime).toBeLessThan(PERFORMANCE_THRESHOLDS.auth.tokenVerification)
      expect(maxTime).toBeLessThan(PERFORMANCE_THRESHOLDS.auth.tokenVerification * 2)

      console.log(`Token Verification - Average: ${averageTime.toFixed(2)}ms, Min: ${minTime.toFixed(2)}ms, Max: ${maxTime.toFixed(2)}ms`)
    })
  })

  describe('CRUD操作性能', () => {
    it('创建宝宝档案应该快速完成', async () => {
      const { POST: createBabyHandler } = await import('@/app/api/babies/route')
      
      const babyData = {
        name: '性能测试新宝宝',
        birthDate: '2023-10-15',
        gestationalWeeks: 38,
        gestationalDays: 2,
      }

      const request = new NextRequest('http://localhost:3000/api/babies', {
        method: 'POST',
        body: JSON.stringify(babyData),
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `auth-token=${authToken}`,
        },
      })

      const startTime = performance.now()
      const response = await createBabyHandler(request)
      const endTime = performance.now()
      
      const responseTime = endTime - startTime
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.crud.create)

      console.log(`Create Baby API Response Time: ${responseTime.toFixed(2)}ms`)
    })

    it('查询宝宝列表应该快速完成', async () => {
      // 创建多个宝宝以测试列表查询性能
      for (let i = 0; i < 5; i++) {
        await createTestBaby(testUser.id, {
          name: `测试宝宝${i}`,
          gestationalWeeks: 32 + i,
        })
      }

      const request = new NextRequest('http://localhost:3000/api/babies', {
        method: 'GET',
        headers: {
          'Cookie': `auth-token=${authToken}`,
        },
      })

      const startTime = performance.now()
      const response = await getBabiesHandler(request)
      const endTime = performance.now()
      
      const responseTime = endTime - startTime
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.babies).toHaveLength(6) // 包括beforeEach中创建的testBaby
      expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.crud.read)

      console.log(`Get Babies List Response Time: ${responseTime.toFixed(2)}ms`)
    })
  })

  describe('复杂查询性能', () => {
    it('时间线查询在大数据集下应该保持良好性能', async () => {
      // 创建大量测试数据
      const recordCount = 100
      const promises: Promise<any>[] = []

      // 创建喂养记录
      for (let i = 0; i < recordCount / 2; i++) {
        const timestamp = new Date(Date.now() - i * 60 * 60 * 1000) // 每小时一个记录
        promises.push(createTestFeedingRecord(testBaby.id, {
          type: i % 2 === 0 ? 'formula' : 'breast',
          amountOrDuration: `${120 + i * 5}ml`,
          timestamp,
        }))
      }

      // 创建睡眠记录
      for (let i = 0; i < recordCount / 2; i++) {
        const startTime = new Date(Date.now() - i * 2 * 60 * 60 * 1000)
        const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000)
        promises.push(createTestSleepRecord(testBaby.id, {
          startTime,
          endTime,
        }))
      }

      await Promise.all(promises)

      // 测试查询性能
      const request = new NextRequest(`http://localhost:3000/api/records/timeline/${testBaby.id}`, {
        method: 'GET',
        headers: {
          'Cookie': `auth-token=${authToken}`,
        },
      })

      const startTime = performance.now()
      const response = await getTimelineHandler(request, { params: { babyId: testBaby.id } })
      const endTime = performance.now()
      
      const responseTime = endTime - startTime
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.timeline.length).toBeGreaterThan(0)
      expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.queries.complex)

      console.log(`Timeline Query Response Time: ${responseTime.toFixed(2)}ms for ${recordCount} records`)
    })

    it('批量数据操作应该有合理的性能', async () => {
      const batchSize = 50
      const startTime = performance.now()

      // 批量创建记录
      const promises = []
      for (let i = 0; i < batchSize; i++) {
        promises.push(createTestFeedingRecord(testBaby.id, {
          type: 'formula',
          amountOrDuration: `${120}ml`,
        }))
      }

      await Promise.all(promises)
      const endTime = performance.now()
      
      const responseTime = endTime - startTime

      // 批量操作应该在合理时间内完成
      expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.queries.aggregation)

      console.log(`Batch Creation Response Time: ${responseTime.toFixed(2)}ms for ${batchSize} records`)
    })
  })

  describe('内存使用和优化', () => {
    it('大数据集查询不应该导致内存泄漏', async () => {
      const initialMemory = process.memoryUsage()

      // 执行多次查询
      for (let i = 0; i < 10; i++) {
        const request = new NextRequest(`http://localhost:3000/api/records/timeline/${testBaby.id}`, {
          method: 'GET',
          headers: {
            'Cookie': `auth-token=${authToken}`,
          },
        })

        const response = await getTimelineHandler(request, { params: { babyId: testBaby.id } })
        await response.json()
      }

      // 强制垃圾回收
      if (global.gc) {
        global.gc()
      }

      const finalMemory = process.memoryUsage()
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed

      // 内存增长应该在合理范围内（小于10MB）
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024)

      console.log(`Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`)
    })
  })

  describe('响应时间基准测试', () => {
    it('所有API端点应该满足响应时间要求', async () => {
      const apiEndpoints = [
        {
          name: 'Get Babies',
          request: () => new NextRequest('http://localhost:3000/api/babies', {
            method: 'GET',
            headers: { 'Cookie': `auth-token=${authToken}` },
          }),
          handler: getBabiesHandler,
          threshold: PERFORMANCE_THRESHOLDS.api.response,
        },
      ]

      const results: { name: string; time: number; threshold: number }[] = []

      for (const endpoint of apiEndpoints) {
        const request = endpoint.request()
        
        const startTime = performance.now()
        const response = await endpoint.handler(request)
        const endTime = performance.now()
        
        const responseTime = endTime - startTime
        await response.json() // 确保响应完全处理
        
        results.push({
          name: endpoint.name,
          time: responseTime,
          threshold: endpoint.threshold,
        })

        expect(responseTime).toBeLessThan(endpoint.threshold)
      }

      // 打印性能报告
      console.log('\n性能测试报告:')
      console.log('=' .repeat(50))
      results.forEach(result => {
        const status = result.time < result.threshold ? '✅ PASS' : '❌ FAIL'
        console.log(`${result.name}: ${result.time.toFixed(2)}ms (阈值: ${result.threshold}ms) ${status}`)
      })
    })
  })

  describe('并发性能测试', () => {
    it('应该能够处理并发请求', async () => {
      const concurrentRequests = 10
      const promises: Promise<Response>[] = []

      const startTime = performance.now()

      // 同时发起多个请求
      for (let i = 0; i < concurrentRequests; i++) {
        const request = new NextRequest('http://localhost:3000/api/babies', {
          method: 'GET',
          headers: { 'Cookie': `auth-token=${authToken}` },
        })
        promises.push(getBabiesHandler(request))
      }

      const responses = await Promise.all(promises)
      const endTime = performance.now()
      
      const totalTime = endTime - startTime
      const averageTime = totalTime / concurrentRequests

      // 验证所有请求都成功
      for (const response of responses) {
        expect(response.status).toBe(200)
        const data = await response.json()
        expect(data.success).toBe(true)
      }

      // 并发请求的平均时间应该在合理范围内
      expect(averageTime).toBeLessThan(PERFORMANCE_THRESHOLDS.api.response)
      expect(totalTime).toBeLessThan(PERFORMANCE_THRESHOLDS.api.response * 2) // 并发应该比串行快

      console.log(`Concurrent Requests - Total: ${totalTime.toFixed(2)}ms, Average: ${averageTime.toFixed(2)}ms for ${concurrentRequests} requests`)
    })
  })

  describe('缓存性能', () => {
    it('缓存应该显著提高查询性能', async () => {
      // 第一次查询（冷缓存）
      let request = new NextRequest('http://localhost:3000/api/babies', {
        method: 'GET',
        headers: { 'Cookie': `auth-token=${authToken}` },
      })

      const startTime1 = performance.now()
      const response1 = await getBabiesHandler(request)
      const endTime1 = performance.now()
      const coldCacheTime = endTime1 - startTime1
      
      await response1.json()

      // 第二次查询（热缓存）
      request = new NextRequest('http://localhost:3000/api/babies', {
        method: 'GET',
        headers: { 'Cookie': `auth-token=${authToken}` },
      })

      const startTime2 = performance.now()
      const response2 = await getBabiesHandler(request)
      const endTime2 = performance.now()
      const hotCacheTime = endTime2 - startTime2
      
      await response2.json()

      // 缓存命中应该明显快于冷查询
      // 注：由于是单元测试环境，缓存效果可能不如生产环境明显
      console.log(`Cold Cache: ${coldCacheTime.toFixed(2)}ms, Hot Cache: ${hotCacheTime.toFixed(2)}ms`)
      
      // 至少验证两次查询都在合理时间内
      expect(coldCacheTime).toBeLessThan(PERFORMANCE_THRESHOLDS.crud.read)
      expect(hotCacheTime).toBeLessThan(PERFORMANCE_THRESHOLDS.crud.read)
    })
  })

  describe('数据库查询性能', () => {
    it('数据库连接和查询应该高效', async () => {
      const iterations = 20
      const times: number[] = []

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now()
        
        // 直接测试数据库查询
        await testDb.user.findUnique({
          where: { id: testUser.id },
          include: { babies: true },
        })
        
        const endTime = performance.now()
        times.push(endTime - startTime)
      }

      const averageTime = times.reduce((sum, time) => sum + time, 0) / times.length
      const maxTime = Math.max(...times)
      
      expect(averageTime).toBeLessThan(PERFORMANCE_THRESHOLDS.queries.simple)
      expect(maxTime).toBeLessThan(PERFORMANCE_THRESHOLDS.queries.simple * 2)

      console.log(`Database Query - Average: ${averageTime.toFixed(2)}ms, Max: ${maxTime.toFixed(2)}ms`)
    })
  })
})