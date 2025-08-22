import {
  phoneLoginSchema,
  emailLoginSchema,
  phoneRegisterSchema,
  emailRegisterSchema,
  babyProfileSchema,
  feedingRecordSchema,
  sleepRecordSchema,
  milestoneCompleteSchema,
  updateProfileSchema,
  timelineQuerySchema,
  summaryQuerySchema,
  trendsQuerySchema,
  paginationSchema,
  babyIdParamSchema,
  milestoneIdParamSchema,
} from '../validations'

describe('validations', () => {
  describe('phoneLoginSchema', () => {
    it('应该验证有效的手机号码和验证码', () => {
      const validData = {
        phone: '13800138000',
        verificationCode: '1234',
      }

      const result = phoneLoginSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('应该拒绝无效的手机号码格式', () => {
      const invalidPhones = [
        '12345678901',  // 不是1开头
        '1380013800',   // 位数不够
        '138001380001', // 位数过多
        '13a00138000',  // 包含字母
        '',             // 空字符串
        '1280013800',   // 第二位不是3-9
      ]

      invalidPhones.forEach(phone => {
        const result = phoneLoginSchema.safeParse({
          phone,
          verificationCode: '1234',
        })
        expect(result.success).toBe(false)
      })
    })

    it('应该拒绝无效的验证码', () => {
      const invalidCodes = [
        '123',      // 少于4位
        '1234567',  // 多于6位
        '12ab',     // 包含字母
        '',         // 空字符串
        ' 1234',    // 包含空格
      ]

      invalidCodes.forEach(verificationCode => {
        const result = phoneLoginSchema.safeParse({
          phone: '13800138000',
          verificationCode,
        })
        expect(result.success).toBe(false)
      })
    })
  })

  describe('emailLoginSchema', () => {
    it('应该验证有效的邮箱和密码', () => {
      const validData = {
        email: 'test@example.com',
        password: 'Password123',
      }

      const result = emailLoginSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.email).toBe('test@example.com') // 应该转为小写
      }
    })

    it('应该拒绝无效的邮箱格式', () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'test@',
        'test..test@example.com',
        '',
      ]

      invalidEmails.forEach(email => {
        const result = emailLoginSchema.safeParse({
          email,
          password: 'Password123',
        })
        expect(result.success).toBe(false)
      })
    })

    it('应该拒绝不符合强度要求的密码', () => {
      const invalidPasswords = [
        'short',        // 少于8位
        'password',     // 没有大写字母和数字
        'PASSWORD',     // 没有小写字母和数字
        '12345678',     // 没有字母
        'Password',     // 没有数字
        'a'.repeat(101), // 超过100位
      ]

      invalidPasswords.forEach(password => {
        const result = emailLoginSchema.safeParse({
          email: 'test@example.com',
          password,
        })
        expect(result.success).toBe(false)
      })
    })

    it('应该将邮箱转换为小写', () => {
      const result = emailLoginSchema.safeParse({
        email: 'TEST@EXAMPLE.COM',
        password: 'Password123',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.email).toBe('test@example.com')
      }
    })
  })

  describe('babyProfileSchema', () => {
    it('应该验证有效的宝宝档案数据', () => {
      const validData = {
        name: '小宝宝',
        birthDate: '2023-10-15',
        gestationalWeeks: 36,
        gestationalDays: 3,
      }

      const result = babyProfileSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('应该拒绝过长的姓名', () => {
      const result = babyProfileSchema.safeParse({
        name: '这是一个超级超级超级长的宝宝名字',
        birthDate: '2023-10-15',
        gestationalWeeks: 36,
        gestationalDays: 3,
      })

      expect(result.success).toBe(false)
    })

    it('应该拒绝未来的出生日期', () => {
      const futureDate = new Date()
      futureDate.setFullYear(futureDate.getFullYear() + 1)

      const result = babyProfileSchema.safeParse({
        name: '小宝宝',
        birthDate: futureDate.toISOString().split('T')[0],
        gestationalWeeks: 36,
        gestationalDays: 3,
      })

      expect(result.success).toBe(false)
    })

    it('应该拒绝无效的孕周范围', () => {
      // 测试孕周过小
      const tooEarly = babyProfileSchema.safeParse({
        name: '小宝宝',
        birthDate: '2023-10-15',
        gestationalWeeks: 19,
        gestationalDays: 0,
      })
      expect(tooEarly.success).toBe(false)

      // 测试孕周过大
      const tooLate = babyProfileSchema.safeParse({
        name: '小宝宝',
        birthDate: '2023-10-15',
        gestationalWeeks: 45,
        gestationalDays: 0,
      })
      expect(tooLate.success).toBe(false)
    })

    it('应该拒绝无效的天数范围', () => {
      // 测试天数为负数
      const negativeDay = babyProfileSchema.safeParse({
        name: '小宝宝',
        birthDate: '2023-10-15',
        gestationalWeeks: 36,
        gestationalDays: -1,
      })
      expect(negativeDay.success).toBe(false)

      // 测试天数超过6
      const tooManyDays = babyProfileSchema.safeParse({
        name: '小宝宝',
        birthDate: '2023-10-15',
        gestationalWeeks: 36,
        gestationalDays: 7,
      })
      expect(tooManyDays.success).toBe(false)
    })
  })

  describe('feedingRecordSchema', () => {
    it('应该验证有效的喂养记录', () => {
      const validData = {
        babyId: 'baby-123',
        type: 'formula',
        amountOrDuration: '120ml',
        timestamp: '2024-01-15T10:00:00Z',
        notes: '宝宝喝得很好',
      }

      const result = feedingRecordSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('应该拒绝无效的喂养类型', () => {
      const result = feedingRecordSchema.safeParse({
        babyId: 'baby-123',
        type: 'invalid-type',
        amountOrDuration: '120ml',
      })

      expect(result.success).toBe(false)
    })

    it('应该验证所有有效的喂养类型', () => {
      const validTypes = ['breast', 'formula', 'solid']

      validTypes.forEach(type => {
        const result = feedingRecordSchema.safeParse({
          babyId: 'baby-123',
          type,
          amountOrDuration: '120ml',
        })
        expect(result.success).toBe(true)
      })
    })

    it('应该允许可选字段为空', () => {
      const result = feedingRecordSchema.safeParse({
        babyId: 'baby-123',
        type: 'formula',
        amountOrDuration: '120ml',
        // timestamp 和 notes 都是可选的
      })

      expect(result.success).toBe(true)
    })
  })

  describe('sleepRecordSchema', () => {
    it('应该验证有效的睡眠记录', () => {
      const validData = {
        babyId: 'baby-123',
        startTime: '2024-01-15T10:00:00Z',
        endTime: '2024-01-15T12:00:00Z',
        notes: '睡得很安稳',
      }

      const result = sleepRecordSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('应该拒绝结束时间早于开始时间', () => {
      const result = sleepRecordSchema.safeParse({
        babyId: 'baby-123',
        startTime: '2024-01-15T12:00:00Z',
        endTime: '2024-01-15T10:00:00Z',
      })

      expect(result.success).toBe(false)
    })

    it('应该拒绝相同的开始和结束时间', () => {
      const sameTime = '2024-01-15T10:00:00Z'
      const result = sleepRecordSchema.safeParse({
        babyId: 'baby-123',
        startTime: sameTime,
        endTime: sameTime,
      })

      expect(result.success).toBe(false)
    })
  })

  describe('milestoneCompleteSchema', () => {
    it('应该验证有效的里程碑完成数据', () => {
      const validData = {
        milestoneId: 'milestone-123',
        achievedAt: '2024-01-15T10:00:00.000Z',
        notes: '宝宝完成得很好',
      }

      const result = milestoneCompleteSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('应该允许可选字段为空', () => {
      const result = milestoneCompleteSchema.safeParse({
        milestoneId: 'milestone-123',
      })

      expect(result.success).toBe(true)
    })

    it('应该拒绝过长的备注', () => {
      const longNotes = 'a'.repeat(501)
      const result = milestoneCompleteSchema.safeParse({
        milestoneId: 'milestone-123',
        notes: longNotes,
      })

      expect(result.success).toBe(false)
    })

    it('应该验证ISO datetime格式', () => {
      const invalidDatetime = '2024-01-15 10:00:00'  // 不是ISO格式
      const result = milestoneCompleteSchema.safeParse({
        milestoneId: 'milestone-123',
        achievedAt: invalidDatetime,
      })

      expect(result.success).toBe(false)
    })
  })

  describe('updateProfileSchema', () => {
    it('应该验证有效的个人资料更新', () => {
      const validData = {
        phone: '13800138000',
        email: 'newemail@example.com',
        currentPassword: 'OldPassword123',
        newPassword: 'NewPassword123',
        confirmNewPassword: 'NewPassword123',
      }

      const result = updateProfileSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('应该拒绝修改密码时不提供当前密码', () => {
      const result = updateProfileSchema.safeParse({
        newPassword: 'NewPassword123',
        confirmNewPassword: 'NewPassword123',
        // 缺少 currentPassword
      })

      expect(result.success).toBe(false)
    })

    it('应该拒绝新密码和确认密码不匹配', () => {
      const result = updateProfileSchema.safeParse({
        currentPassword: 'OldPassword123',
        newPassword: 'NewPassword123',
        confirmNewPassword: 'DifferentPassword123',
      })

      expect(result.success).toBe(false)
    })

    it('应该允许只更新邮箱或手机号', () => {
      const phoneOnly = updateProfileSchema.safeParse({
        phone: '13800138001',
      })
      expect(phoneOnly.success).toBe(true)

      const emailOnly = updateProfileSchema.safeParse({
        email: 'newemail@example.com',
      })
      expect(emailOnly.success).toBe(true)
    })
  })

  describe('查询参数验证', () => {
    describe('timelineQuerySchema', () => {
      it('应该提供默认值', () => {
        const result = timelineQuerySchema.safeParse({})

        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.page).toBe(1)
          expect(result.data.limit).toBe(20)
          expect(result.data.type).toBe('all')
        }
      })

      it('应该强制转换字符串数字', () => {
        const result = timelineQuerySchema.safeParse({
          page: '2',
          limit: '50',
        })

        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.page).toBe(2)
          expect(result.data.limit).toBe(50)
        }
      })

      it('应该验证日期格式', () => {
        const validDate = timelineQuerySchema.safeParse({
          date: '2024-01-15',
        })
        expect(validDate.success).toBe(true)

        const invalidDate = timelineQuerySchema.safeParse({
          date: '2024/01/15',  // 错误格式
        })
        expect(invalidDate.success).toBe(false)
      })

      it('应该限制分页参数范围', () => {
        // 测试页码最小值
        const minPage = timelineQuerySchema.safeParse({ page: 0 })
        expect(minPage.success).toBe(false)

        // 测试限制最大值
        const maxLimit = timelineQuerySchema.safeParse({ limit: 101 })
        expect(maxLimit.success).toBe(false)
      })
    })

    describe('summaryQuerySchema', () => {
      it('应该验证有效的时间段', () => {
        const validPeriods = ['today', 'week', 'month']

        validPeriods.forEach(period => {
          const result = summaryQuerySchema.safeParse({ period })
          expect(result.success).toBe(true)
        })
      })

      it('应该拒绝无效的时间段', () => {
        const result = summaryQuerySchema.safeParse({ period: 'year' })
        expect(result.success).toBe(false)
      })
    })

    describe('trendsQuerySchema', () => {
      it('应该限制时间段范围', () => {
        const validPeriod = trendsQuerySchema.safeParse({ period: 30 })
        expect(validPeriod.success).toBe(true)

        const tooShort = trendsQuerySchema.safeParse({ period: 0 })
        expect(tooShort.success).toBe(false)

        const tooLong = trendsQuerySchema.safeParse({ period: 91 })
        expect(tooLong.success).toBe(false)
      })
    })
  })

  describe('参数验证', () => {
    describe('babyIdParamSchema', () => {
      it('应该验证非空的宝宝ID', () => {
        const valid = babyIdParamSchema.safeParse({ babyId: 'baby-123' })
        expect(valid.success).toBe(true)

        const empty = babyIdParamSchema.safeParse({ babyId: '' })
        expect(empty.success).toBe(false)
      })
    })

    describe('milestoneIdParamSchema', () => {
      it('应该验证非空的里程碑ID', () => {
        const valid = milestoneIdParamSchema.safeParse({ milestoneId: 'milestone-123' })
        expect(valid.success).toBe(true)

        const empty = milestoneIdParamSchema.safeParse({ milestoneId: '' })
        expect(empty.success).toBe(false)
      })
    })

    describe('paginationSchema', () => {
      it('应该强制转换和提供默认值', () => {
        const result = paginationSchema.safeParse({
          page: '3',
          limit: '25',
        })

        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.page).toBe(3)
          expect(result.data.limit).toBe(25)
        }
      })
    })
  })

  describe('边界情况测试', () => {
    it('应该处理undefined和null值', () => {
      // 测试必填字段
      const phoneSchema = phoneLoginSchema.safeParse({
        phone: null,
        verificationCode: undefined,
      })
      expect(phoneSchema.success).toBe(false)

      // 测试可选字段
      const feedingSchema = feedingRecordSchema.safeParse({
        babyId: 'baby-123',
        type: 'formula',
        amountOrDuration: '120ml',
        timestamp: null,
        notes: undefined,
      })
      expect(feedingSchema.success).toBe(true)
    })

    it('应该处理空对象', () => {
      const emptyBabyProfile = babyProfileSchema.safeParse({})
      expect(emptyBabyProfile.success).toBe(false)

      const emptyTimeline = timelineQuerySchema.safeParse({})
      expect(emptyTimeline.success).toBe(true) // 有默认值
    })

    it('应该处理额外的字段', () => {
      const withExtraFields = phoneLoginSchema.safeParse({
        phone: '13800138000',
        verificationCode: '1234',
        extraField: 'should be ignored',
      })
      
      expect(withExtraFields.success).toBe(true)
      if (withExtraFields.success) {
        expect('extraField' in withExtraFields.data).toBe(false)
      }
    })
  })
})