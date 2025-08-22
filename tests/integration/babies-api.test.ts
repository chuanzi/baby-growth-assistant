import { NextRequest } from 'next/server'
import { POST as createBabyHandler, GET as getBabiesHandler } from '@/app/api/babies/route'
import { GET as getBabyHandler, PUT as updateBabyHandler, DELETE as deleteBabyHandler } from '@/app/api/babies/[id]/route'
import { setupTestDatabase, cleanupTestDatabase, createTestUser, createTestBaby } from '../setup/db-setup'
import { signToken } from '@/lib/auth'

describe('Babies API Integration Tests', () => {
  let testDb: any
  let testUser: any
  let authToken: string

  beforeAll(async () => {
    testDb = setupTestDatabase()
  })

  afterAll(async () => {
    await cleanupTestDatabase()
  })

  beforeEach(async () => {
    await cleanupTestDatabase()
    testDb = setupTestDatabase()
    
    // 创建测试用户并生成token
    testUser = await createTestUser({ phone: '13800138000' })
    authToken = await signToken({ userId: testUser.id, phone: testUser.phone })
  })

  describe('POST /api/babies', () => {
    it('应该成功创建宝宝档案', async () => {
      const babyData = {
        name: '小宝贝',
        birthDate: '2023-10-15',
        gestationalWeeks: 36,
        gestationalDays: 3,
      }

      const request = new NextRequest('http://localhost:3000/api/babies', {
        method: 'POST',
        body: JSON.stringify(babyData),
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `auth-token=${authToken}`,
        },
      })

      const response = await createBabyHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('宝宝档案创建成功')
      expect(data.baby).toBeDefined()
      expect(data.baby.name).toBe('小宝贝')
      expect(data.baby.gestationalWeeks).toBe(36)
      expect(data.baby.gestationalDays).toBe(3)
      expect(data.baby.id).toBeDefined()
    })

    it('应该处理字符串形式的孕周数据', async () => {
      const babyData = {
        name: '小宝贝',
        birthDate: '2023-10-15',
        gestationalWeeks: '36', // 字符串格式
        gestationalDays: '3',   // 字符串格式
      }

      const request = new NextRequest('http://localhost:3000/api/babies', {
        method: 'POST',
        body: JSON.stringify(babyData),
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `auth-token=${authToken}`,
        },
      })

      const response = await createBabyHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.baby.gestationalWeeks).toBe(36)
      expect(data.baby.gestationalDays).toBe(3)
    })

    it('应该拒绝未认证的请求', async () => {
      const babyData = {
        name: '小宝贝',
        birthDate: '2023-10-15',
        gestationalWeeks: 36,
        gestationalDays: 3,
      }

      const request = new NextRequest('http://localhost:3000/api/babies', {
        method: 'POST',
        body: JSON.stringify(babyData),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await createBabyHandler(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('请先登录')
    })

    it('应该拒绝无效的输入数据', async () => {
      const invalidBabyData = {
        name: '', // 空名字
        birthDate: '2023-10-15',
        gestationalWeeks: 15, // 太小的孕周
        gestationalDays: 3,
      }

      const request = new NextRequest('http://localhost:3000/api/babies', {
        method: 'POST',
        body: JSON.stringify(invalidBabyData),
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `auth-token=${authToken}`,
        },
      })

      const response = await createBabyHandler(request)
      
      expect(response.status).toBe(500) // 验证错误
    })

    it('应该拒绝未来的出生日期', async () => {
      const futureDate = new Date()
      futureDate.setFullYear(futureDate.getFullYear() + 1)

      const babyData = {
        name: '未来宝宝',
        birthDate: futureDate.toISOString().split('T')[0],
        gestationalWeeks: 36,
        gestationalDays: 3,
      }

      const request = new NextRequest('http://localhost:3000/api/babies', {
        method: 'POST',
        body: JSON.stringify(babyData),
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `auth-token=${authToken}`,
        },
      })

      const response = await createBabyHandler(request)
      
      expect(response.status).toBe(500)
    })
  })

  describe('GET /api/babies', () => {
    it('应该返回用户的所有宝宝档案', async () => {
      // 先创建几个测试宝宝
      const baby1 = await createTestBaby(testUser.id, {
        name: '大宝',
        birthDate: new Date('2023-01-15'),
        gestationalWeeks: 38,
        gestationalDays: 2,
      })

      const baby2 = await createTestBaby(testUser.id, {
        name: '二宝',
        birthDate: new Date('2023-10-15'),
        gestationalWeeks: 36,
        gestationalDays: 5,
      })

      const request = new NextRequest('http://localhost:3000/api/babies', {
        method: 'GET',
        headers: {
          'Cookie': `auth-token=${authToken}`,
        },
      })

      const response = await getBabiesHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.babies).toHaveLength(2)
      expect(data.babies[0].name).toBe('二宝') // 按创建时间倒序
      expect(data.babies[1].name).toBe('大宝')
    })

    it('应该为没有宝宝的用户返回空数组', async () => {
      const request = new NextRequest('http://localhost:3000/api/babies', {
        method: 'GET',
        headers: {
          'Cookie': `auth-token=${authToken}`,
        },
      })

      const response = await getBabiesHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.babies).toHaveLength(0)
    })

    it('应该拒绝未认证的请求', async () => {
      const request = new NextRequest('http://localhost:3000/api/babies', {
        method: 'GET',
      })

      const response = await getBabiesHandler(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('请先登录')
    })

    it('应该只返回当前用户的宝宝', async () => {
      // 创建另一个用户和宝宝
      const anotherUser = await createTestUser({ phone: '13800138001' })
      await createTestBaby(anotherUser.id, {
        name: '别人的宝宝',
      })

      // 创建当前用户的宝宝
      await createTestBaby(testUser.id, {
        name: '我的宝宝',
      })

      const request = new NextRequest('http://localhost:3000/api/babies', {
        method: 'GET',
        headers: {
          'Cookie': `auth-token=${authToken}`,
        },
      })

      const response = await getBabiesHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.babies).toHaveLength(1)
      expect(data.babies[0].name).toBe('我的宝宝')
    })
  })

  describe('GET /api/babies/[id]', () => {
    it('应该返回指定的宝宝档案', async () => {
      const baby = await createTestBaby(testUser.id, {
        name: '测试宝宝',
        gestationalWeeks: 32,
        gestationalDays: 4,
      })

      const request = new NextRequest(`http://localhost:3000/api/babies/${baby.id}`, {
        method: 'GET',
        headers: {
          'Cookie': `auth-token=${authToken}`,
        },
      })

      const response = await getBabyHandler(request, { params: { id: baby.id } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.baby.id).toBe(baby.id)
      expect(data.baby.name).toBe('测试宝宝')
      expect(data.baby.gestationalWeeks).toBe(32)
      expect(data.baby.gestationalDays).toBe(4)
    })

    it('应该拒绝访问不存在的宝宝', async () => {
      const request = new NextRequest('http://localhost:3000/api/babies/nonexistent', {
        method: 'GET',
        headers: {
          'Cookie': `auth-token=${authToken}`,
        },
      })

      const response = await getBabyHandler(request, { params: { id: 'nonexistent' } })
      
      expect(response.status).toBe(404)
    })

    it('应该拒绝访问其他用户的宝宝', async () => {
      // 创建另一个用户的宝宝
      const anotherUser = await createTestUser({ phone: '13800138002' })
      const anotherBaby = await createTestBaby(anotherUser.id, {
        name: '别人的宝宝',
      })

      const request = new NextRequest(`http://localhost:3000/api/babies/${anotherBaby.id}`, {
        method: 'GET',
        headers: {
          'Cookie': `auth-token=${authToken}`,
        },
      })

      const response = await getBabyHandler(request, { params: { id: anotherBaby.id } })
      
      expect(response.status).toBe(404) // 应该表现为不存在
    })
  })

  describe('PUT /api/babies/[id]', () => {
    it('应该成功更新宝宝档案', async () => {
      const baby = await createTestBaby(testUser.id, {
        name: '原名字',
        gestationalWeeks: 36,
        gestationalDays: 0,
      })

      const updateData = {
        name: '新名字',
        gestationalWeeks: 36,
        gestationalDays: 5,
      }

      const request = new NextRequest(`http://localhost:3000/api/babies/${baby.id}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `auth-token=${authToken}`,
        },
      })

      const response = await updateBabyHandler(request, { params: { id: baby.id } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.baby.name).toBe('新名字')
      expect(data.baby.gestationalDays).toBe(5)
    })

    it('应该拒绝更新不存在的宝宝', async () => {
      const updateData = {
        name: '新名字',
      }

      const request = new NextRequest('http://localhost:3000/api/babies/nonexistent', {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `auth-token=${authToken}`,
        },
      })

      const response = await updateBabyHandler(request, { params: { id: 'nonexistent' } })
      
      expect(response.status).toBe(404)
    })

    it('应该拒绝更新其他用户的宝宝', async () => {
      const anotherUser = await createTestUser({ phone: '13800138003' })
      const anotherBaby = await createTestBaby(anotherUser.id, {
        name: '别人的宝宝',
      })

      const updateData = {
        name: '试图修改',
      }

      const request = new NextRequest(`http://localhost:3000/api/babies/${anotherBaby.id}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `auth-token=${authToken}`,
        },
      })

      const response = await updateBabyHandler(request, { params: { id: anotherBaby.id } })
      
      expect(response.status).toBe(404)
    })

    it('应该验证更新数据的有效性', async () => {
      const baby = await createTestBaby(testUser.id)

      const invalidData = {
        name: '', // 空名字
        gestationalWeeks: 15, // 无效的孕周
      }

      const request = new NextRequest(`http://localhost:3000/api/babies/${baby.id}`, {
        method: 'PUT',
        body: JSON.stringify(invalidData),
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `auth-token=${authToken}`,
        },
      })

      const response = await updateBabyHandler(request, { params: { id: baby.id } })
      
      expect(response.status).toBe(400)
    })
  })

  describe('DELETE /api/babies/[id]', () => {
    it('应该成功删除宝宝档案', async () => {
      const baby = await createTestBaby(testUser.id, {
        name: '要删除的宝宝',
      })

      const request = new NextRequest(`http://localhost:3000/api/babies/${baby.id}`, {
        method: 'DELETE',
        headers: {
          'Cookie': `auth-token=${authToken}`,
        },
      })

      const response = await deleteBabyHandler(request, { params: { id: baby.id } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('宝宝档案删除成功')
    })

    it('应该同时删除相关的记录数据', async () => {
      const baby = await createTestBaby(testUser.id, {
        name: '有记录的宝宝',
      })

      // 创建一些相关记录
      // 注：这里需要实际的记录创建逻辑

      const request = new NextRequest(`http://localhost:3000/api/babies/${baby.id}`, {
        method: 'DELETE',
        headers: {
          'Cookie': `auth-token=${authToken}`,
        },
      })

      const response = await deleteBabyHandler(request, { params: { id: baby.id } })
      
      expect(response.status).toBe(200)
      
      // 验证宝宝确实被删除
      const verifyRequest = new NextRequest(`http://localhost:3000/api/babies/${baby.id}`, {
        method: 'GET',
        headers: {
          'Cookie': `auth-token=${authToken}`,
        },
      })

      const verifyResponse = await getBabyHandler(verifyRequest, { params: { id: baby.id } })
      expect(verifyResponse.status).toBe(404)
    })

    it('应该拒绝删除不存在的宝宝', async () => {
      const request = new NextRequest('http://localhost:3000/api/babies/nonexistent', {
        method: 'DELETE',
        headers: {
          'Cookie': `auth-token=${authToken}`,
        },
      })

      const response = await deleteBabyHandler(request, { params: { id: 'nonexistent' } })
      
      expect(response.status).toBe(404)
    })

    it('应该拒绝删除其他用户的宝宝', async () => {
      const anotherUser = await createTestUser({ phone: '13800138004' })
      const anotherBaby = await createTestBaby(anotherUser.id, {
        name: '别人的宝宝',
      })

      const request = new NextRequest(`http://localhost:3000/api/babies/${anotherBaby.id}`, {
        method: 'DELETE',
        headers: {
          'Cookie': `auth-token=${authToken}`,
        },
      })

      const response = await deleteBabyHandler(request, { params: { id: anotherBaby.id } })
      
      expect(response.status).toBe(404)
    })
  })

  describe('数据完整性测试', () => {
    it('应该正确处理日期格式', async () => {
      const babyData = {
        name: '日期测试宝宝',
        birthDate: '2023-12-25T00:00:00.000Z', // ISO格式
        gestationalWeeks: 38,
        gestationalDays: 0,
      }

      const request = new NextRequest('http://localhost:3000/api/babies', {
        method: 'POST',
        body: JSON.stringify(babyData),
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `auth-token=${authToken}`,
        },
      })

      const response = await createBabyHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.baby.birthDate).toContain('2023-12-25')
    })

    it('应该正确处理极早产儿数据', async () => {
      const prematureBabyData = {
        name: '极早产宝宝',
        birthDate: '2023-10-15',
        gestationalWeeks: 24, // 极早产
        gestationalDays: 0,
      }

      const request = new NextRequest('http://localhost:3000/api/babies', {
        method: 'POST',
        body: JSON.stringify(prematureBabyData),
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `auth-token=${authToken}`,
        },
      })

      const response = await createBabyHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.baby.gestationalWeeks).toBe(24)
    })

    it('应该正确处理过期产儿数据', async () => {
      const postTermBabyData = {
        name: '过期产宝宝',
        birthDate: '2023-10-15',
        gestationalWeeks: 42, // 过期产
        gestationalDays: 2,
      }

      const request = new NextRequest('http://localhost:3000/api/babies', {
        method: 'POST',
        body: JSON.stringify(postTermBabyData),
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `auth-token=${authToken}`,
        },
      })

      const response = await createBabyHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.baby.gestationalWeeks).toBe(42)
    })
  })

  describe('完整CRUD流程测试', () => {
    it('应该支持创建->查询->更新->删除的完整流程', async () => {
      // 1. 创建
      const createData = {
        name: '流程测试宝宝',
        birthDate: '2023-10-15',
        gestationalWeeks: 36,
        gestationalDays: 3,
      }

      const createRequest = new NextRequest('http://localhost:3000/api/babies', {
        method: 'POST',
        body: JSON.stringify(createData),
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `auth-token=${authToken}`,
        },
      })

      const createResponse = await createBabyHandler(createRequest)
      const createResult = await createResponse.json()
      
      expect(createResponse.status).toBe(200)
      const babyId = createResult.baby.id

      // 2. 查询单个
      const getRequest = new NextRequest(`http://localhost:3000/api/babies/${babyId}`, {
        method: 'GET',
        headers: {
          'Cookie': `auth-token=${authToken}`,
        },
      })

      const getResponse = await getBabyHandler(getRequest, { params: { id: babyId } })
      const getResult = await getResponse.json()
      
      expect(getResponse.status).toBe(200)
      expect(getResult.baby.name).toBe('流程测试宝宝')

      // 3. 查询列表
      const listRequest = new NextRequest('http://localhost:3000/api/babies', {
        method: 'GET',
        headers: {
          'Cookie': `auth-token=${authToken}`,
        },
      })

      const listResponse = await getBabiesHandler(listRequest)
      const listResult = await listResponse.json()
      
      expect(listResponse.status).toBe(200)
      expect(listResult.babies).toHaveLength(1)

      // 4. 更新
      const updateData = {
        name: '更新后的名字',
        gestationalDays: 5,
      }

      const updateRequest = new NextRequest(`http://localhost:3000/api/babies/${babyId}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `auth-token=${authToken}`,
        },
      })

      const updateResponse = await updateBabyHandler(updateRequest, { params: { id: babyId } })
      const updateResult = await updateResponse.json()
      
      expect(updateResponse.status).toBe(200)
      expect(updateResult.baby.name).toBe('更新后的名字')

      // 5. 删除
      const deleteRequest = new NextRequest(`http://localhost:3000/api/babies/${babyId}`, {
        method: 'DELETE',
        headers: {
          'Cookie': `auth-token=${authToken}`,
        },
      })

      const deleteResponse = await deleteBabyHandler(deleteRequest, { params: { id: babyId } })
      
      expect(deleteResponse.status).toBe(200)

      // 6. 验证删除
      const verifyRequest = new NextRequest(`http://localhost:3000/api/babies/${babyId}`, {
        method: 'GET',
        headers: {
          'Cookie': `auth-token=${authToken}`,
        },
      })

      const verifyResponse = await getBabyHandler(verifyRequest, { params: { id: babyId } })
      expect(verifyResponse.status).toBe(404)
    })
  })
})