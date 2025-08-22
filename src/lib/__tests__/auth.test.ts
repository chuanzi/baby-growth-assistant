import { signToken, verifyToken, getSession, requireAuth } from '../auth'

// 模拟 next/headers
const mockCookies = {
  get: jest.fn(),
}

jest.mock('next/headers', () => ({
  cookies: jest.fn(() => mockCookies),
}))

describe('auth', () => {
  const testPayload = {
    userId: 'user-123',
    phone: '13800138000',
  }

  beforeEach(() => {
    jest.clearAllMocks()
    // 重置环境变量
    process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing'
  })

  describe('signToken', () => {
    it('应该生成有效的JWT令牌', async () => {
      const token = await signToken(testPayload)
      
      expect(typeof token).toBe('string')
      expect(token.length).toBeGreaterThan(0)
      
      // JWT格式应该有三个部分，用.分隔
      const parts = token.split('.')
      expect(parts).toHaveLength(3)
    })

    it('应该为相同的payload生成不同的token（因为时间戳）', async () => {
      const token1 = await signToken(testPayload)
      
      // 等待1毫秒确保时间戳不同
      await new Promise(resolve => setTimeout(resolve, 1))
      
      const token2 = await signToken(testPayload)
      
      expect(token1).not.toBe(token2)
    })

    it('应该为不同的payload生成不同的token', async () => {
      const payload1 = { userId: 'user-1' }
      const payload2 = { userId: 'user-2' }
      
      const token1 = await signToken(payload1)
      const token2 = await signToken(payload2)
      
      expect(token1).not.toBe(token2)
    })

    it('应该处理空的payload', async () => {
      const token = await signToken({})
      
      expect(typeof token).toBe('string')
      expect(token.length).toBeGreaterThan(0)
    })

    it('应该处理包含特殊字符的payload', async () => {
      const specialPayload = {
        userId: 'user-123',
        email: 'test@example.com',
        special: 'äöü!@#$%^&*()',
      }
      
      const token = await signToken(specialPayload)
      
      expect(typeof token).toBe('string')
      expect(token.length).toBeGreaterThan(0)
    })
  })

  describe('verifyToken', () => {
    it('应该验证有效的token', async () => {
      const token = await signToken(testPayload)
      const payload = await verifyToken(token)
      
      expect(payload).toBeTruthy()
      expect(payload?.userId).toBe(testPayload.userId)
      expect(payload?.phone).toBe(testPayload.phone)
    })

    it('应该拒绝无效的token', async () => {
      const invalidToken = 'invalid.jwt.token'
      const payload = await verifyToken(invalidToken)
      
      expect(payload).toBeNull()
    })

    it('应该拒绝空token', async () => {
      const payload = await verifyToken('')
      
      expect(payload).toBeNull()
    })

    it('应该拒绝格式错误的token', async () => {
      const malformedTokens = [
        'not.a.jwt',
        'onlyonepart',
        'two.parts',
        'four.parts.here.now',
        null as string,
        undefined as unknown as string,
      ]
      
      for (const token of malformedTokens) {
        const payload = await verifyToken(token)
        expect(payload).toBeNull()
      }
    })

    it('应该拒绝被篡改的token', async () => {
      const token = await signToken(testPayload)
      
      // 篡改token的某一部分
      const parts = token.split('.')
      parts[1] = 'tampered-payload'
      const tamperedToken = parts.join('.')
      
      const payload = await verifyToken(tamperedToken)
      expect(payload).toBeNull()
    })

    it('应该验证包含标准JWT claims的token', async () => {
      const token = await signToken(testPayload)
      const payload = await verifyToken(token)
      
      expect(payload).toBeTruthy()
      expect(payload?.iat).toBeDefined() // issued at
      expect(payload?.exp).toBeDefined() // expiration time
      expect(typeof payload?.iat).toBe('number')
      expect(typeof payload?.exp).toBe('number')
    })

    it('应该处理过期时间检查（模拟）', async () => {
      // 这个测试验证token结构是否包含过期时间
      // 实际过期测试需要更复杂的时间模拟
      const token = await signToken(testPayload)
      const payload = await verifyToken(token)
      
      expect(payload?.exp).toBeDefined()
      const expirationDate = new Date((payload?.exp as number) * 1000)
      const now = new Date()
      
      // 验证过期时间是未来的时间（7天后）
      expect(expirationDate.getTime()).toBeGreaterThan(now.getTime())
    })
  })

  describe('getSession', () => {
    it('应该从cookie中获取有效的session', async () => {
      const token = await signToken(testPayload)
      
      mockCookies.get.mockReturnValue({ value: token })
      
      const session = await getSession()
      
      expect(session).toBeTruthy()
      expect(session?.userId).toBe(testPayload.userId)
      expect(session?.phone).toBe(testPayload.phone)
      expect(mockCookies.get).toHaveBeenCalledWith('auth-token')
    })

    it('应该在没有cookie时返回null', async () => {
      mockCookies.get.mockReturnValue(undefined)
      
      const session = await getSession()
      
      expect(session).toBeNull()
      expect(mockCookies.get).toHaveBeenCalledWith('auth-token')
    })

    it('应该在cookie值为空时返回null', async () => {
      mockCookies.get.mockReturnValue({ value: '' })
      
      const session = await getSession()
      
      expect(session).toBeNull()
    })

    it('应该在cookie包含无效token时返回null', async () => {
      mockCookies.get.mockReturnValue({ value: 'invalid.token.here' })
      
      const session = await getSession()
      
      expect(session).toBeNull()
    })

    it('应该处理cookie获取异常', async () => {
      mockCookies.get.mockImplementation(() => {
        throw new Error('Cookie access error')
      })
      
      // getSession应该捕获异常并返回null，而不是抛出错误
      const session = await getSession()
      
      expect(session).toBeNull()
    })
  })

  describe('requireAuth', () => {
    it('应该返回有效的session', async () => {
      const token = await signToken(testPayload)
      mockCookies.get.mockReturnValue({ value: token })
      
      const session = await requireAuth()
      
      expect(session).toBeTruthy()
      expect(session.userId).toBe(testPayload.userId)
      expect(session.phone).toBe(testPayload.phone)
    })

    it('应该在没有session时抛出错误', async () => {
      mockCookies.get.mockReturnValue(undefined)
      
      await expect(requireAuth()).rejects.toThrow('Unauthorized')
    })

    it('应该在session无效时抛出错误', async () => {
      mockCookies.get.mockReturnValue({ value: 'invalid.token' })
      
      await expect(requireAuth()).rejects.toThrow('Unauthorized')
    })

    it('应该在session没有userId时抛出错误', async () => {
      const tokenWithoutUserId = await signToken({ phone: '13800138000' })
      mockCookies.get.mockReturnValue({ value: tokenWithoutUserId })
      
      await expect(requireAuth()).rejects.toThrow('Unauthorized')
    })

    it('应该在session的userId为空时抛出错误', async () => {
      const tokenWithEmptyUserId = await signToken({ userId: '', phone: '13800138000' })
      mockCookies.get.mockReturnValue({ value: tokenWithEmptyUserId })
      
      await expect(requireAuth()).rejects.toThrow('Unauthorized')
    })

    it('应该在session的userId为null时抛出错误', async () => {
      const tokenWithNullUserId = await signToken({ userId: null, phone: '13800138000' })
      mockCookies.get.mockReturnValue({ value: tokenWithNullUserId })
      
      await expect(requireAuth()).rejects.toThrow('Unauthorized')
    })
  })

  describe('安全性测试', () => {
    it('应该使用正确的算法（HS256）', async () => {
      const token = await signToken(testPayload)
      
      // 解码JWT header部分来检查算法
      const parts = token.split('.')
      const header = JSON.parse(
        Buffer.from(parts[0], 'base64url').toString('utf8')
      )
      
      expect(header.alg).toBe('HS256')
    })

    it('应该设置7天的过期时间', async () => {
      const beforeSign = Math.floor(Date.now() / 1000)
      const token = await signToken(testPayload)
      const afterSign = Math.floor(Date.now() / 1000)
      
      const payload = await verifyToken(token)
      
      expect(payload?.exp).toBeDefined()
      const expiration = payload?.exp as number
      const issuedAt = payload?.iat as number
      
      // 验证过期时间大约是7天后（允许一些时间误差）
      const expectedExp = issuedAt + 7 * 24 * 60 * 60 // 7天的秒数
      expect(Math.abs(expiration - expectedExp)).toBeLessThan(2) // 允许2秒误差
      
      // 验证签发时间在合理范围内
      expect(issuedAt).toBeGreaterThanOrEqual(beforeSign)
      expect(issuedAt).toBeLessThanOrEqual(afterSign)
    })

    it('应该使用环境变量中的密钥', async () => {
      // 设置不同的JWT_SECRET
      const originalSecret = process.env.JWT_SECRET
      process.env.JWT_SECRET = 'different-secret'
      
      const token1 = await signToken(testPayload)
      
      // 恢复原来的密钥并验证
      process.env.JWT_SECRET = originalSecret
      
      const payload = await verifyToken(token1)
      
      // 由于密钥不同，验证应该失败
      expect(payload).toBeNull()
    })

    it('应该在没有JWT_SECRET时使用默认密钥', async () => {
      const originalSecret = process.env.JWT_SECRET
      delete process.env.JWT_SECRET
      
      const token = await signToken(testPayload)
      const payload = await verifyToken(token)
      
      // 即使没有环境变量，也应该能正常工作（使用默认密钥）
      expect(payload).toBeTruthy()
      expect(payload?.userId).toBe(testPayload.userId)
      
      // 恢复环境变量
      process.env.JWT_SECRET = originalSecret
    })
  })

  describe('性能和边界测试', () => {
    it('应该处理大payload', async () => {
      const largePayload = {
        userId: 'user-123',
        data: 'x'.repeat(1000), // 1KB的数据
      }
      
      const token = await signToken(largePayload)
      const payload = await verifyToken(token)
      
      expect(payload?.userId).toBe(largePayload.userId)
      expect(payload?.data).toBe(largePayload.data)
    })

    it('应该处理嵌套对象payload', async () => {
      const complexPayload = {
        userId: 'user-123',
        profile: {
          name: 'Test User',
          preferences: {
            theme: 'dark',
            notifications: true,
          },
        },
        roles: ['user', 'parent'],
      }
      
      const token = await signToken(complexPayload)
      const payload = await verifyToken(token)
      
      expect(payload?.userId).toBe(complexPayload.userId)
      expect(payload?.profile?.name).toBe(complexPayload.profile.name)
      expect(payload?.profile?.preferences?.theme).toBe(complexPayload.profile.preferences.theme)
      expect(payload?.roles).toEqual(complexPayload.roles)
    })

    it('应该快速执行（性能测试）', async () => {
      const start = Date.now()
      
      // 执行多次token操作
      const promises = []
      for (let i = 0; i < 10; i++) {
        const token = await signToken({ userId: `user-${i}` })
        promises.push(verifyToken(token))
      }
      
      await Promise.all(promises)
      
      const end = Date.now()
      const duration = end - start
      
      // 10次完整的签名+验证操作应该在合理时间内完成
      expect(duration).toBeLessThan(1000) // 1秒
    })
  })
})