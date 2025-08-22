import { calculateAge, formatAge, getAgeCategory } from '../age-calculator'
import type { Baby } from '@/types'

describe('age-calculator', () => {
  // 固定测试时间：2024年1月15日
  const mockCurrentDate = new Date('2024-01-15T10:00:00Z')
  
  beforeAll(() => {
    // 模拟当前时间
    jest.useFakeTimers()
    jest.setSystemTime(mockCurrentDate)
  })

  afterAll(() => {
    jest.useRealTimers()
  })

  describe('calculateAge', () => {
    it('应该正确计算足月儿的年龄（40周）', () => {
      const baby: Baby = {
        id: 'test-1',
        userId: 'user-1',
        name: '测试宝宝',
        birthDate: new Date('2023-10-15'), // 3个月前出生
        gestationalWeeks: 40,
        gestationalDays: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const result = calculateAge(baby)

      expect(result.actualAge.months).toBe(3)
      expect(result.actualAge.days).toBe(0)
      // 足月儿的矫正年龄等于实际年龄
      expect(result.correctedAge.months).toBe(3)
      expect(result.correctedAge.days).toBe(0)
      expect(result.correctedAgeInDays).toBe(92) // 约3个月
    })

    it('应该正确计算早产儿的矫正年龄（32周）', () => {
      const baby: Baby = {
        id: 'test-2',
        userId: 'user-1',
        name: '早产宝宝',
        birthDate: new Date('2023-10-15'), // 3个月前出生
        gestationalWeeks: 32,
        gestationalDays: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const result = calculateAge(baby)

      expect(result.actualAge.months).toBe(3)
      expect(result.actualAge.days).toBe(0)
      // 32周早产，需要减去8周（56天）的矫正
      expect(result.correctedAge.months).toBe(1)
      expect(result.correctedAge.days).toBe(6) // 约1个月又6天
      expect(result.correctedAgeInDays).toBe(36) // 实际天数减去早产天数
    })

    it('应该处理32周+3天的早产儿', () => {
      const baby: Baby = {
        id: 'test-3',
        userId: 'user-1',
        name: '早产宝宝',
        birthDate: new Date('2023-10-15'),
        gestationalWeeks: 32,
        gestationalDays: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const result = calculateAge(baby)

      // 32周+3天 = 227天，40周 = 280天，差53天
      expect(result.actualAge.months).toBe(3)
      // 矫正年龄应该减去早产的53天
      expect(result.correctedAgeInDays).toBe(39) // 约1个月又9天
    })

    it('应该处理极早产儿（28周）', () => {
      const baby: Baby = {
        id: 'test-4',
        userId: 'user-1',
        name: '极早产宝宝',
        birthDate: new Date('2023-07-15'), // 6个月前出生
        gestationalWeeks: 28,
        gestationalDays: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const result = calculateAge(baby)

      expect(result.actualAge.months).toBe(6)
      // 28周早产，需要减去12周（84天）的矫正
      expect(result.correctedAge.months).toBe(3)
      expect(result.correctedAgeInDays).toBe(100) // 6个月减去84天约等于3个月
    })

    it('应该处理新生儿（刚出生）', () => {
      const baby: Baby = {
        id: 'test-5',
        userId: 'user-1',
        name: '新生儿',
        birthDate: new Date('2024-01-15'), // 今天出生
        gestationalWeeks: 35,
        gestationalDays: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const result = calculateAge(baby)

      expect(result.actualAge.months).toBe(0)
      expect(result.actualAge.days).toBe(0)
      // 35周+2天早产，矫正年龄应该是负数，但我们设置为0
      expect(result.correctedAge.months).toBe(0)
      expect(result.correctedAge.days).toBe(0)
      expect(result.correctedAgeInDays).toBe(0)
    })

    it('应该处理无效的出生日期', () => {
      const baby: Baby = {
        id: 'test-6',
        userId: 'user-1',
        name: '无效日期宝宝',
        birthDate: new Date('invalid-date'),
        gestationalWeeks: 40,
        gestationalDays: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const result = calculateAge(baby)

      expect(result.actualAge.months).toBe(0)
      expect(result.actualAge.days).toBe(0)
      expect(result.correctedAge.months).toBe(0)
      expect(result.correctedAge.days).toBe(0)
      expect(result.correctedAgeInDays).toBe(0)
    })

    it('应该处理字符串类型的孕周（类型兼容性）', () => {
      const baby: Baby = {
        id: 'test-7',
        userId: 'user-1',
        name: '类型测试宝宝',
        birthDate: new Date('2023-10-15'),
        gestationalWeeks: '36' as unknown as number, // 模拟从表单传来的字符串
        gestationalDays: '4' as unknown as number,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const result = calculateAge(baby)

      expect(result.actualAge.months).toBe(3)
      // 36周+4天，减去早产的天数
      expect(result.correctedAgeInDays).toBeGreaterThan(60) // 应该大于2个月
    })

    it('应该处理未定义的孕周数据', () => {
      const baby: Baby = {
        id: 'test-8',
        userId: 'user-1',
        name: '未定义孕周宝宝',
        birthDate: new Date('2023-10-15'),
        gestationalWeeks: undefined as unknown as number,
        gestationalDays: undefined as unknown as number,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const result = calculateAge(baby)

      // 应该默认为足月儿（40周）
      expect(result.actualAge.months).toBe(3)
      expect(result.correctedAge.months).toBe(3)
      expect(result.correctedAgeInDays).toBe(92)
    })
  })

  describe('formatAge', () => {
    it('应该正确格式化只有天数的年龄', () => {
      expect(formatAge(0, 15)).toBe('15天')
      expect(formatAge(0, 0)).toBe('0天')
    })

    it('应该正确格式化只有月数的年龄', () => {
      expect(formatAge(3, 0)).toBe('3个月')
      expect(formatAge(1, 0)).toBe('1个月')
    })

    it('应该正确格式化月和天的组合', () => {
      expect(formatAge(2, 15)).toBe('2个月15天')
      expect(formatAge(1, 1)).toBe('1个月1天')
    })

    it('应该处理边界情况', () => {
      expect(formatAge(0, 1)).toBe('1天')
      expect(formatAge(12, 30)).toBe('12个月30天')
    })
  })

  describe('getAgeCategory', () => {
    it('应该正确分类0-2个月', () => {
      expect(getAgeCategory(0)).toBe('0-2个月')
      expect(getAgeCategory(30)).toBe('0-2个月')
      expect(getAgeCategory(59)).toBe('0-2个月')
    })

    it('应该正确分类2-4个月', () => {
      expect(getAgeCategory(60)).toBe('2-4个月')
      expect(getAgeCategory(90)).toBe('2-4个月')
      expect(getAgeCategory(119)).toBe('2-4个月')
    })

    it('应该正确分类4-6个月', () => {
      expect(getAgeCategory(120)).toBe('4-6个月')
      expect(getAgeCategory(150)).toBe('4-6个月')
      expect(getAgeCategory(179)).toBe('4-6个月')
    })

    it('应该正确分类6-9个月', () => {
      expect(getAgeCategory(180)).toBe('6-9个月')
      expect(getAgeCategory(225)).toBe('6-9个月')
      expect(getAgeCategory(269)).toBe('6-9个月')
    })

    it('应该正确分类9-12个月', () => {
      expect(getAgeCategory(270)).toBe('9-12个月')
      expect(getAgeCategory(300)).toBe('9-12个月')
      expect(getAgeCategory(364)).toBe('9-12个月')
    })

    it('应该正确分类12个月以上', () => {
      expect(getAgeCategory(365)).toBe('12个月以上')
      expect(getAgeCategory(400)).toBe('12个月以上')
      expect(getAgeCategory(1000)).toBe('12个月以上')
    })

    it('应该处理负数输入', () => {
      expect(getAgeCategory(-10)).toBe('0-2个月')
      expect(getAgeCategory(-1)).toBe('0-2个月')
    })
  })

  describe('边界情况和异常处理', () => {
    it('应该处理未来的出生日期', () => {
      const baby: Baby = {
        id: 'test-future',
        userId: 'user-1',
        name: '未来宝宝',
        birthDate: new Date('2024-12-31'), // 未来日期
        gestationalWeeks: 40,
        gestationalDays: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const result = calculateAge(baby)

      // 未来日期应该返回0
      expect(result.actualAge.months).toBe(0)
      expect(result.actualAge.days).toBe(0)
      expect(result.correctedAgeInDays).toBe(0)
    })

    it('应该处理极小的孕周（边界情况）', () => {
      const baby: Baby = {
        id: 'test-tiny',
        userId: 'user-1',
        name: '极小孕周宝宝',
        birthDate: new Date('2023-10-15'),
        gestationalWeeks: 22, // 极早产的下限
        gestationalDays: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const result = calculateAge(baby)

      expect(result.actualAge.months).toBe(3)
      // 22周早产，矫正年龄应该很小或为0
      expect(result.correctedAgeInDays).toBe(0) // 因为矫正后是负数，设置为0
    })

    it('应该处理过大的孕周（边界情况）', () => {
      const baby: Baby = {
        id: 'test-big',
        userId: 'user-1',
        name: '过大孕周宝宝',
        birthDate: new Date('2023-10-15'),
        gestationalWeeks: 44, // 过期产
        gestationalDays: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const result = calculateAge(baby)

      expect(result.actualAge.months).toBe(3)
      // 44周出生，矫正年龄应该比实际年龄大
      expect(result.correctedAgeInDays).toBeGreaterThan(92)
    })
  })
})