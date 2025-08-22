import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { POST as loginHandler } from '@/app/api/auth/login/route'
import { POST as registerHandler } from '@/app/api/auth/register/route'
import { GET as meHandler } from '@/app/api/auth/me/route'
import { POST as logoutHandler } from '@/app/api/auth/logout/route'
import { setupTestDatabase, cleanupTestDatabase, createTestUser } from '../setup/db-setup'
import { signToken } from '@/lib/auth'

// 模拟 verifyCode 函数
jest.mock('@/app/api/auth/send-code/route', () => ({
  verifyCode: jest.fn().mockReturnValue(true),
}))

describe('Authentication API Integration Tests', () => {
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

  describe('POST /api/auth/register', () => {
    describe('手机号注册', () => {
      it('应该成功注册新用户', async () => {
        const requestBody = {
          method: 'phone',
          phone: '13800138000',
          verificationCode: '1234',
        }

        const request = new NextRequest('http://localhost:3000/api/auth/register', {
          method: 'POST',
          body: JSON.stringify(requestBody),
          headers: { 'Content-Type': 'application/json' },
        })

        const response = await registerHandler(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.message).toBe('注册成功')
        expect(data.user).toBeDefined()
        expect(data.user.phone).toBe('13800138000')
        expect(data.user.id).toBeDefined()

        // 检查cookie是否设置
        const setCookieHeader = response.headers.get('set-cookie')
        expect(setCookieHeader).toContain('auth-token=')
      })

      it('应该拒绝重复注册相同手机号', async () => {
        // 先创建用户
        await createTestUser({ phone: '13800138000' })

        const requestBody = {
          method: 'phone',
          phone: '13800138000',
          verificationCode: '1234',
        }

        const request = new NextRequest('http://localhost:3000/api/auth/register', {
          method: 'POST',
          body: JSON.stringify(requestBody),
          headers: { 'Content-Type': 'application/json' },
        })

        const response = await registerHandler(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('该手机号已被注册')
      })

      it('应该拒绝无效的验证码', async () => {
        // 模拟验证码验证失败
        const { verifyCode } = require('@/app/api/auth/send-code/route')
        verifyCode.mockReturnValueOnce(false)

        const requestBody = {
          method: 'phone',
          phone: '13800138000',
          verificationCode: '0000',
        }

        const request = new NextRequest('http://localhost:3000/api/auth/register', {
          method: 'POST',
          body: JSON.stringify(requestBody),
          headers: { 'Content-Type': 'application/json' },
        })

        const response = await registerHandler(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('验证码错误或已过期')
      })
    })

    describe('邮箱注册', () => {
      it('应该成功注册新用户', async () => {
        const requestBody = {
          method: 'email',
          email: 'test@example.com',
          password: 'Password123',
          confirmPassword: 'Password123',
        }

        const request = new NextRequest('http://localhost:3000/api/auth/register', {
          method: 'POST',
          body: JSON.stringify(requestBody),
          headers: { 'Content-Type': 'application/json' },
        })

        const response = await registerHandler(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.user.email).toBe('test@example.com')
        expect(data.user.password).toBeUndefined() // 密码不应该返回
      })

      it('应该拒绝重复注册相同邮箱', async () => {
        await createTestUser({ 
          email: 'test@example.com',
          password: await bcrypt.hash('Password123', 12)
        })

        const requestBody = {
          method: 'email',
          email: 'test@example.com',
          password: 'Password123',
          confirmPassword: 'Password123',
        }

        const request = new NextRequest('http://localhost:3000/api/auth/register', {
          method: 'POST',
          body: JSON.stringify(requestBody),
          headers: { 'Content-Type': 'application/json' },
        })

        const response = await registerHandler(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('该邮箱已被注册')
      })
    })

    describe('输入验证', () => {
      it('应该拒绝无效的手机号格式', async () => {
        const requestBody = {
          method: 'phone',
          phone: '12345',
          verificationCode: '1234',
        }

        const request = new NextRequest('http://localhost:3000/api/auth/register', {
          method: 'POST',
          body: JSON.stringify(requestBody),
          headers: { 'Content-Type': 'application/json' },
        })

        const response = await registerHandler(request)
        
        expect(response.status).toBe(400)
      })

      it('应该拒绝弱密码', async () => {
        const requestBody = {
          method: 'email',
          email: 'test@example.com',
          password: 'weak',
          confirmPassword: 'weak',
        }

        const request = new NextRequest('http://localhost:3000/api/auth/register', {
          method: 'POST',
          body: JSON.stringify(requestBody),
          headers: { 'Content-Type': 'application/json' },
        })

        const response = await registerHandler(request)
        
        expect(response.status).toBe(400)
      })
    })
  })

  describe('POST /api/auth/login', () => {
    describe('手机号登录', () => {
      it('应该成功登录现有用户', async () => {
        // 先创建用户
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
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.message).toBe('登录成功')
        expect(data.user.id).toBe(user.id)
        expect(data.user.phone).toBe('13800138000')
      })

      it('应该拒绝不存在的用户', async () => {
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
        const data = await response.json()

        expect(response.status).toBe(404)
        expect(data.error).toBe('用户不存在，请先注册')
      })
    })

    describe('邮箱登录', () => {
      it('应该成功登录现有用户', async () => {
        const password = 'Password123'
        const hashedPassword = await bcrypt.hash(password, 12)
        
        const user = await createTestUser({ 
          email: 'test@example.com',
          password: hashedPassword
        })

        const requestBody = {
          method: 'email',
          email: 'test@example.com',
          password,
        }

        const request = new NextRequest('http://localhost:3000/api/auth/login', {
          method: 'POST',
          body: JSON.stringify(requestBody),
          headers: { 'Content-Type': 'application/json' },
        })

        const response = await loginHandler(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.user.id).toBe(user.id)
        expect(data.user.email).toBe('test@example.com')
      })

      it('应该拒绝错误密码', async () => {
        const hashedPassword = await bcrypt.hash('Password123', 12)
        
        await createTestUser({ 
          email: 'test@example.com',
          password: hashedPassword
        })

        const requestBody = {
          method: 'email',
          email: 'test@example.com',
          password: 'WrongPassword',
        }

        const request = new NextRequest('http://localhost:3000/api/auth/login', {
          method: 'POST',
          body: JSON.stringify(requestBody),
          headers: { 'Content-Type': 'application/json' },
        })

        const response = await loginHandler(request)
        const data = await response.json()

        expect(response.status).toBe(401)
        expect(data.error).toBe('邮箱或密码错误')
      })

      it('应该拒绝不存在的邮箱', async () => {
        const requestBody = {
          method: 'email',
          email: 'nonexistent@example.com',
          password: 'Password123',
        }

        const request = new NextRequest('http://localhost:3000/api/auth/login', {
          method: 'POST',
          body: JSON.stringify(requestBody),
          headers: { 'Content-Type': 'application/json' },
        })

        const response = await loginHandler(request)
        const data = await response.json()

        expect(response.status).toBe(401)
        expect(data.error).toBe('邮箱或密码错误')
      })
    })

    describe('不支持的登录方式', () => {
      it('应该拒绝不支持的认证方法', async () => {
        const requestBody = {
          method: 'unsupported',
          username: 'test',
          password: 'password',
        }

        const request = new NextRequest('http://localhost:3000/api/auth/login', {
          method: 'POST',
          body: JSON.stringify(requestBody),
          headers: { 'Content-Type': 'application/json' },
        })

        const response = await loginHandler(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('不支持的登录方式')
      })
    })
  })

  describe('GET /api/auth/me', () => {
    it('应该返回已认证用户信息', async () => {
      const user = await createTestUser({ phone: '13800138000' })
      const token = await signToken({ userId: user.id, phone: user.phone })

      const request = new NextRequest('http://localhost:3000/api/auth/me', {
        method: 'GET',
        headers: {
          'Cookie': `auth-token=${token}`,
        },
      })

      const response = await meHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.user.id).toBe(user.id)
      expect(data.user.phone).toBe(user.phone)
    })

    it('应该拒绝未认证的请求', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/me', {
        method: 'GET',
      })

      const response = await meHandler(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('未授权访问')
    })

    it('应该拒绝无效token', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/me', {
        method: 'GET',
        headers: {
          'Cookie': 'auth-token=invalid.token.here',
        },
      })

      const response = await meHandler(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('未授权访问')
    })
  })

  describe('POST /api/auth/logout', () => {
    it('应该成功注销用户', async () => {
      const user = await createTestUser({ phone: '13800138000' })
      const token = await signToken({ userId: user.id, phone: user.phone })

      const request = new NextRequest('http://localhost:3000/api/auth/logout', {
        method: 'POST',
        headers: {
          'Cookie': `auth-token=${token}`,
        },
      })

      const response = await logoutHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('退出登录成功')

      // 检查cookie是否被清除
      const setCookieHeader = response.headers.get('set-cookie')
      expect(setCookieHeader).toContain('auth-token=;')
      expect(setCookieHeader).toContain('Max-Age=0')
    })

    it('应该允许未认证用户注销', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/logout', {
        method: 'POST',
      })

      const response = await logoutHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })

  describe('完整认证流程测试', () => {
    it('应该支持注册->登录->获取信息->注销的完整流程', async () => {
      // 1. 注册
      const registerRequest = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          method: 'phone',
          phone: '13800138000',
          verificationCode: '1234',
        }),
        headers: { 'Content-Type': 'application/json' },
      })

      const registerResponse = await registerHandler(registerRequest)
      expect(registerResponse.status).toBe(200)

      // 提取token
      const setCookieHeader = registerResponse.headers.get('set-cookie')!
      const tokenMatch = setCookieHeader.match(/auth-token=([^;]+)/)
      const token = tokenMatch![1]

      // 2. 获取用户信息
      const meRequest = new NextRequest('http://localhost:3000/api/auth/me', {
        method: 'GET',
        headers: {
          'Cookie': `auth-token=${token}`,
        },
      })

      const meResponse = await meHandler(meRequest)
      const meData = await meResponse.json()
      expect(meResponse.status).toBe(200)
      expect(meData.user.phone).toBe('13800138000')

      // 3. 注销
      const logoutRequest = new NextRequest('http://localhost:3000/api/auth/logout', {
        method: 'POST',
        headers: {
          'Cookie': `auth-token=${token}`,
        },
      })

      const logoutResponse = await logoutHandler(logoutRequest)
      expect(logoutResponse.status).toBe(200)

      // 4. 验证注销后无法访问受保护资源
      const meAfterLogoutRequest = new NextRequest('http://localhost:3000/api/auth/me', {
        method: 'GET',
        headers: {
          'Cookie': 'auth-token=;', // 使用清空的token
        },
      })

      const meAfterLogoutResponse = await meHandler(meAfterLogoutRequest)
      expect(meAfterLogoutResponse.status).toBe(401)
    })
  })

  describe('安全性测试', () => {
    it('应该正确处理SQL注入尝试', async () => {
      const requestBody = {
        method: 'phone',
        phone: "'; DROP TABLE users; --",
        verificationCode: '1234',
      }

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await loginHandler(request)
      
      // 应该因为验证失败而被拒绝，而不是执行SQL注入
      expect(response.status).toBe(400)
    })

    it('应该正确处理XSS尝试', async () => {
      const requestBody = {
        method: 'email',
        email: '<script>alert("xss")</script>@example.com',
        password: 'Password123',
        confirmPassword: 'Password123',
      }

      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await registerHandler(request)
      
      // 应该因为邮箱格式验证失败而被拒绝
      expect(response.status).toBe(400)
    })

    it('应该正确设置安全的cookie属性', async () => {
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
      expect(setCookieHeader).toContain('Max-Age=604800') // 7 days
    })
  })

  describe('错误处理', () => {
    it('应该处理数据库连接错误', async () => {
      // 模拟数据库错误
      const originalFindUnique = testDb.user.findUnique
      testDb.user.findUnique = jest.fn().mockRejectedValue(new Error('Database connection error'))

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
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('登录失败，请稍后重试')

      // 恢复原始方法
      testDb.user.findUnique = originalFindUnique
    })

    it('应该处理无效的JSON输入', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: 'invalid json',
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await loginHandler(request)

      expect(response.status).toBe(500)
    })
  })
})