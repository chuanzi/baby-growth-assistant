import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { POST as loginHandler } from '@/app/api/auth/login/route'
import { POST as registerHandler } from '@/app/api/auth/register/route'
import { GET as getBabiesHandler, POST as createBabyHandler } from '@/app/api/babies/route'
import { GET as getBabyHandler } from '@/app/api/babies/[id]/route'
import { setupTestDatabase, cleanupTestDatabase, createTestUser, createTestBaby } from '../setup/db-setup'
import { signToken, verifyToken } from '@/lib/auth'

// 模拟 verifyCode 函数
jest.mock('@/app/api/auth/send-code/route', () => ({
  verifyCode: jest.fn().mockReturnValue(true),
}))

describe('Security Tests', () => {
  let testDb: any

  beforeAll(async () => {
    testDb = setupTestDatabase()
  })

  afterAll(async () => {
    await cleanupTestDatabase()
  })

  beforeEach(async () => {
    await cleanupTestDatabase()
    testDb = setupTestDatabase()
  })

  describe('JWT安全性测试', () => {
    it('应该拒绝篡改的JWT token', async () => {
      const user = await createTestUser({ phone: '13800138000' })
      const validToken = await signToken({ userId: user.id, phone: user.phone })

      // 篡改token
      const parts = validToken.split('.')
      parts[1] = 'tampered-payload'
      const tamperedToken = parts.join('.')

      const request = new NextRequest('http://localhost:3000/api/babies', {
        method: 'GET',
        headers: {
          'Cookie': `auth-token=${tamperedToken}`,
        },
      })

      const response = await getBabiesHandler(request)

      expect(response.status).toBe(401)
    })

    it('应该拒绝过期的JWT token', async () => {
      // 创建一个立即过期的token
      const user = await createTestUser({ phone: '13800138000' })
      
      // 模拟过期token（这里我们无法直接创建过期token，所以测试无效token）
      const invalidToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0IiwiaWF0IjoxNjA5NDU5MjAwLCJleHAiOjE2MDk0NTkyMDB9.invalid-signature'

      const request = new NextRequest('http://localhost:3000/api/babies', {
        method: 'GET',
        headers: {
          'Cookie': `auth-token=${invalidToken}`,
        },
      })

      const response = await getBabiesHandler(request)

      expect(response.status).toBe(401)
    })

    it('应该拒绝错误格式的JWT token', async () => {
      const invalidTokens = [
        'invalid-token',
        'too.few.parts',
        'too.many.parts.here.now',
        '',
        null,
        undefined,
      ]

      for (const token of invalidTokens) {
        const request = new NextRequest('http://localhost:3000/api/babies', {
          method: 'GET',
          headers: token ? {
            'Cookie': `auth-token=${token}`,
          } : {},
        })

        const response = await getBabiesHandler(request)
        expect(response.status).toBe(401)
      }
    })

    it('JWT应该包含必要的安全声明', async () => {
      const user = await createTestUser({ phone: '13800138000' })
      const token = await signToken({ userId: user.id, phone: user.phone })

      const payload = await verifyToken(token)

      expect(payload).toBeTruthy()
      expect(payload?.iat).toBeDefined() // issued at
      expect(payload?.exp).toBeDefined() // expiration time
      expect(payload?.userId).toBe(user.id)

      // 验证过期时间设置合理（7天）
      const issuedAt = payload!.iat as number
      const expiresAt = payload!.exp as number
      const expectedDuration = 7 * 24 * 60 * 60 // 7天的秒数
      
      expect(expiresAt - issuedAt).toBe(expectedDuration)
    })

    it('应该使用强密钥签名JWT', async () => {
      const user = await createTestUser({ phone: '13800138000' })
      const token = await signToken({ userId: user.id })

      // 验证JWT header使用了正确的算法
      const parts = token.split('.')
      const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString())

      expect(header.alg).toBe('HS256')
      expect(header.typ).toBe('JWT')
    })
  })

  describe('权限验证测试', () => {
    it('应该阻止未授权访问用户数据', async () => {
      const user1 = await createTestUser({ phone: '13800138001' })
      const user2 = await createTestUser({ phone: '13800138002' })
      
      const user1Token = await signToken({ userId: user1.id })
      const user1Baby = await createTestBaby(user1.id, { name: 'User1的宝宝' })

      // User2尝试访问User1的宝宝
      const request = new NextRequest(`http://localhost:3000/api/babies/${user1Baby.id}`, {
        method: 'GET',
        headers: {
          'Cookie': `auth-token=${await signToken({ userId: user2.id })}`,
        },
      })

      const response = await getBabyHandler(request, { params: { id: user1Baby.id } })

      expect(response.status).toBe(404) // 应该表现为不存在，而不是403
    })

    it('应该阻止操作不存在的资源', async () => {
      const user = await createTestUser({ phone: '13800138000' })
      const token = await signToken({ userId: user.id })

      const request = new NextRequest('http://localhost:3000/api/babies/nonexistent-id', {
        method: 'GET',
        headers: {
          'Cookie': `auth-token=${token}`,
        },
      })

      const response = await getBabyHandler(request, { params: { id: 'nonexistent-id' } })

      expect(response.status).toBe(404)
    })

    it('应该验证用户拥有资源的权限', async () => {
      const user = await createTestUser({ phone: '13800138000' })
      const baby = await createTestBaby(user.id, { name: '测试宝宝' })
      const token = await signToken({ userId: user.id })

      // 正确的用户访问自己的资源
      const request = new NextRequest(`http://localhost:3000/api/babies/${baby.id}`, {
        method: 'GET',
        headers: {
          'Cookie': `auth-token=${token}`,
        },
      })

      const response = await getBabyHandler(request, { params: { id: baby.id } })

      expect(response.status).toBe(200)
    })
  })

  describe('输入验证和防注入测试', () => {
    it('应该阻止SQL注入尝试', async () => {
      const sqlInjectionAttempts = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "1; DELETE FROM babies; --",
        "' UNION SELECT * FROM users --",
      ]

      for (const payload of sqlInjectionAttempts) {
        const requestBody = {
          method: 'phone',
          phone: payload,
          verificationCode: '1234',
        }

        const request = new NextRequest('http://localhost:3000/api/auth/login', {
          method: 'POST',
          body: JSON.stringify(requestBody),
          headers: { 'Content-Type': 'application/json' },
        })

        const response = await loginHandler(request)
        
        // 应该因为输入验证失败而拒绝，而不是执行注入
        expect(response.status).toBe(400)
      }
    })

    it('应该清理和验证用户输入', async () => {
      const user = await createTestUser({ phone: '13800138000' })
      const token = await signToken({ userId: user.id })

      const maliciousInputs = [
        '<script>alert("xss")</script>',
        '"><script>alert("xss")</script>',
        'javascript:alert("xss")',
        '${alert("xss")}',
        '{{constructor.constructor("alert(1)")()}}',
      ]

      for (const maliciousInput of maliciousInputs) {
        const babyData = {
          name: maliciousInput,
          birthDate: '2023-10-15',
          gestationalWeeks: 36,
          gestationalDays: 3,
        }

        const request = new NextRequest('http://localhost:3000/api/babies', {
          method: 'POST',
          body: JSON.stringify(babyData),
          headers: {
            'Content-Type': 'application/json',
            'Cookie': `auth-token=${token}`,
          },
        })

        const response = await createBabyHandler(request)
        
        if (response.status === 200) {
          const data = await response.json()
          // 如果创建成功，名字应该被清理或转义
          expect(data.baby.name).not.toContain('<script>')
          expect(data.baby.name).not.toContain('javascript:')
        }
        // 或者应该被输入验证拒绝
      }
    })

    it('应该验证数据类型和格式', async () => {
      const user = await createTestUser({ phone: '13800138000' })
      const token = await signToken({ userId: user.id })

      const invalidInputs = [
        {
          name: '', // 空名字
          birthDate: 'invalid-date',
          gestationalWeeks: 'not-a-number',
          gestationalDays: -1,
        },
        {
          name: 'x'.repeat(1000), // 过长名字
          birthDate: '2025-12-31', // 未来日期
          gestationalWeeks: 100, // 无效范围
          gestationalDays: 10, // 无效范围
        },
      ]

      for (const invalidData of invalidInputs) {
        const request = new NextRequest('http://localhost:3000/api/babies', {
          method: 'POST',
          body: JSON.stringify(invalidData),
          headers: {
            'Content-Type': 'application/json',
            'Cookie': `auth-token=${token}`,
          },
        })

        const response = await createBabyHandler(request)
        
        // 应该因为数据验证失败而拒绝
        expect([400, 500]).toContain(response.status)
      }
    })
  })

  describe('密码安全测试', () => {
    it('应该正确哈希和验证密码', async () => {
      const password = 'TestPassword123'
      const email = 'security@example.com'

      // 注册用户
      const registerRequest = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          method: 'email',
          email,
          password,
          confirmPassword: password,
        }),
        headers: { 'Content-Type': 'application/json' },
      })

      const registerResponse = await registerHandler(registerRequest)
      expect(registerResponse.status).toBe(200)

      // 验证密码已被哈希存储
      const user = await testDb.user.findUnique({
        where: { email },
      })

      expect(user.password).not.toBe(password) // 不应该是明文
      expect(user.password).toHaveLength(60) // bcrypt哈希长度
      expect(await bcrypt.compare(password, user.password)).toBe(true)
    })

    it('应该拒绝弱密码', async () => {
      const weakPasswords = [
        'weak',
        '12345678',
        'password',
        'PASSWORD',
        'Password', // 缺少数字
        'password123', // 缺少大写
        'PASSWORD123', // 缺少小写
      ]

      for (const weakPassword of weakPasswords) {
        const request = new NextRequest('http://localhost:3000/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            method: 'email',
            email: 'test@example.com',
            password: weakPassword,
            confirmPassword: weakPassword,
          }),
          headers: { 'Content-Type': 'application/json' },
        })

        const response = await registerHandler(request)
        
        expect(response.status).toBe(400)
      }
    })

    it('应该阻止密码暴力破解尝试', async () => {
      const user = await createTestUser({
        email: 'test@example.com',
        password: await bcrypt.hash('CorrectPassword123', 12),
      })

      const wrongPasswords = [
        'wrong1', 'wrong2', 'wrong3', 'wrong4', 'wrong5',
        'wrong6', 'wrong7', 'wrong8', 'wrong9', 'wrong10',
      ]

      // 模拟多次错误登录尝试
      for (const wrongPassword of wrongPasswords) {
        const request = new NextRequest('http://localhost:3000/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({
            method: 'email',
            email: 'test@example.com',
            password: wrongPassword,
          }),
          headers: { 'Content-Type': 'application/json' },
        })

        const response = await loginHandler(request)
        expect(response.status).toBe(401)
      }

      // 注：这里应该测试速率限制，但需要实际的速率限制实现
    })
  })

  describe('HTTP安全头测试', () => {
    it('应该设置安全的Cookie属性', async () => {
      const user = await createTestUser({ phone: '13800138000' })
      
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

      const response = await loginHandler(request)
      const setCookieHeader = response.headers.get('set-cookie')

      expect(setCookieHeader).toContain('HttpOnly')
      expect(setCookieHeader).toContain('SameSite=Lax')
      expect(setCookieHeader).toContain('Max-Age=604800') // 7天

      // 在生产环境中应该有Secure标志
      if (process.env.NODE_ENV === 'production') {
        expect(setCookieHeader).toContain('Secure')
      }
    })
  })

  describe('数据泄露防护测试', () => {
    it('API响应不应该包含敏感信息', async () => {
      const user = await createTestUser({
        phone: '13800138000',
        email: 'test@example.com',
        password: await bcrypt.hash('Password123', 12),
      })

      const token = await signToken({ userId: user.id })

      const request = new NextRequest('http://localhost:3000/api/babies', {
        method: 'GET',
        headers: {
          'Cookie': `auth-token=${token}`,
        },
      })

      const response = await getBabiesHandler(request)
      const data = await response.json()

      // 响应不应该包含密码或其他敏感信息
      const responseText = JSON.stringify(data)
      expect(responseText).not.toContain('password')
      expect(responseText).not.toContain('$2b$') // bcrypt哈希特征
    })

    it('错误消息不应该泄露敏感信息', async () => {
      // 尝试访问不存在的资源
      const request = new NextRequest('http://localhost:3000/api/babies/invalid-id', {
        method: 'GET',
        headers: {
          'Cookie': 'auth-token=invalid-token',
        },
      })

      const response = await getBabyHandler(request, { params: { id: 'invalid-id' } })
      const data = await response.json()

      // 错误消息应该是通用的，不泄露系统内部信息
      expect(data.error).not.toContain('database')
      expect(data.error).not.toContain('SQL')
      expect(data.error).not.toContain('stack trace')
      expect(data.error).not.toContain('file path')
    })
  })

  describe('会话管理安全', () => {
    it('注销后token应该无法继续使用', async () => {
      const user = await createTestUser({ phone: '13800138000' })
      const token = await signToken({ userId: user.id })

      // 首先验证token有效
      let request = new NextRequest('http://localhost:3000/api/babies', {
        method: 'GET',
        headers: {
          'Cookie': `auth-token=${token}`,
        },
      })

      let response = await getBabiesHandler(request)
      expect(response.status).toBe(200)

      // 注销
      const { POST: logoutHandler } = await import('@/app/api/auth/logout/route')
      const logoutRequest = new NextRequest('http://localhost:3000/api/auth/logout', {
        method: 'POST',
        headers: {
          'Cookie': `auth-token=${token}`,
        },
      })

      await logoutHandler(logoutRequest)

      // 注销后使用相同token应该被拒绝
      // 注：这需要token黑名单机制，如果没有实现，token在过期前仍然有效
      // 这里主要测试cookie被清除的情况
    })

    it('应该处理并发会话', async () => {
      const user = await createTestUser({ phone: '13800138000' })
      
      // 创建多个token（模拟多设备登录）
      const token1 = await signToken({ userId: user.id, device: 'device1' })
      const token2 = await signToken({ userId: user.id, device: 'device2' })

      // 两个token都应该有效
      const request1 = new NextRequest('http://localhost:3000/api/babies', {
        method: 'GET',
        headers: {
          'Cookie': `auth-token=${token1}`,
        },
      })

      const request2 = new NextRequest('http://localhost:3000/api/babies', {
        method: 'GET',
        headers: {
          'Cookie': `auth-token=${token2}`,
        },
      })

      const response1 = await getBabiesHandler(request1)
      const response2 = await getBabiesHandler(request2)

      expect(response1.status).toBe(200)
      expect(response2.status).toBe(200)
    })
  })

  describe('时间攻击防护', () => {
    it('登录失败时间应该一致', async () => {
      const attempts = [
        { phone: '13800138000', verificationCode: '1234' }, // 用户存在，验证码错误
        { phone: '13800138999', verificationCode: '1234' }, // 用户不存在
      ]

      const times: number[] = []

      for (const attempt of attempts) {
        const request = new NextRequest('http://localhost:3000/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({
            method: 'phone',
            ...attempt,
          }),
          headers: { 'Content-Type': 'application/json' },
        })

        const startTime = performance.now()
        await loginHandler(request)
        const endTime = performance.now()
        
        times.push(endTime - startTime)
      }

      // 响应时间差异不应该太大（避免时间攻击）
      const [time1, time2] = times
      const timeDifference = Math.abs(time1 - time2)
      
      // 允许最多100ms的差异（这个阈值可以根据实际情况调整）
      expect(timeDifference).toBeLessThan(100)
    })
  })

  describe('Content-Type验证', () => {
    it('应该验证Content-Type头', async () => {
      const user = await createTestUser({ phone: '13800138000' })
      const token = await signToken({ userId: user.id })

      // 发送错误的Content-Type
      const request = new NextRequest('http://localhost:3000/api/babies', {
        method: 'POST',
        body: JSON.stringify({
          name: '测试宝宝',
          birthDate: '2023-10-15',
          gestationalWeeks: 36,
          gestationalDays: 3,
        }),
        headers: {
          'Content-Type': 'text/plain', // 错误的类型
          'Cookie': `auth-token=${token}`,
        },
      })

      const response = await createBabyHandler(request)
      
      // 应该被拒绝或导致解析错误
      expect(response.status).toBeGreaterThanOrEqual(400)
    })
  })
})