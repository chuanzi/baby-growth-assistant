import { render, screen } from '@testing-library/react'
import { AgeDisplay, CompactAgeDisplay } from '../AgeDisplay'
import type { AgeInfo } from '@/types'

describe('AgeDisplay', () => {
  const mockAgeInfo: AgeInfo = {
    actualAge: { months: 3, days: 15 },
    correctedAge: { months: 2, days: 10 },
    correctedAgeInDays: 70,
  }

  const defaultProps = {
    babyName: '小宝宝',
    ageInfo: mockAgeInfo,
  }

  describe('基础渲染', () => {
    it('应该正确渲染宝宝姓名', () => {
      render(<AgeDisplay {...defaultProps} />)
      
      expect(screen.getByText('宝宝 小宝宝')).toBeInTheDocument()
    })

    it('应该显示实际月龄', () => {
      render(<AgeDisplay {...defaultProps} />)
      
      expect(screen.getByText('实际月龄')).toBeInTheDocument()
      expect(screen.getByText('3')).toBeInTheDocument()
      expect(screen.getByText('个月 15天')).toBeInTheDocument()
      expect(screen.getByText('出生至今')).toBeInTheDocument()
    })

    it('应该显示矫正月龄', () => {
      render(<AgeDisplay {...defaultProps} />)
      
      expect(screen.getByText('矫正月龄 ⭐')).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument()
      expect(screen.getByText('个月 10天')).toBeInTheDocument()
      expect(screen.getByText('发育指导基准')).toBeInTheDocument()
    })

    it('应该显示宝宝emoji', () => {
      render(<AgeDisplay {...defaultProps} />)
      
      expect(screen.getByText('👶')).toBeInTheDocument()
    })
  })

  describe('早产宝宝标识', () => {
    it('应该为早产宝宝显示特殊标识', () => {
      const prematureAgeInfo: AgeInfo = {
        actualAge: { months: 3, days: 0 },
        correctedAge: { months: 1, days: 15 }, // 矫正月龄明显小于实际月龄
        correctedAgeInDays: 45,
      }

      render(<AgeDisplay {...defaultProps} ageInfo={prematureAgeInfo} />)
      
      expect(screen.getByText('早产宝宝专属护理')).toBeInTheDocument()
    })

    it('应该为足月宝宝不显示早产标识', () => {
      const fullTermAgeInfo: AgeInfo = {
        actualAge: { months: 3, days: 0 },
        correctedAge: { months: 3, days: 0 }, // 矫正月龄等于实际月龄
        correctedAgeInDays: 90,
      }

      render(<AgeDisplay {...defaultProps} ageInfo={fullTermAgeInfo} />)
      
      expect(screen.queryByText('早产宝宝专属护理')).not.toBeInTheDocument()
    })
  })

  describe('成长提示', () => {
    it('应该默认显示成长提示', () => {
      render(<AgeDisplay {...defaultProps} />)
      
      expect(screen.getByText('成长提示:')).toBeInTheDocument()
      expect(screen.getByText('💡')).toBeInTheDocument()
    })

    it('应该为早产宝宝显示专门的提示', () => {
      const prematureAgeInfo: AgeInfo = {
        actualAge: { months: 4, days: 0 },
        correctedAge: { months: 2, days: 15 },
        correctedAgeInDays: 75,
      }

      render(<AgeDisplay {...defaultProps} ageInfo={prematureAgeInfo} />)
      
      expect(screen.getByText(/宝宝的发育进度以矫正月龄为准，目前正处在2个月的发育阶段/)).toBeInTheDocument()
    })

    it('应该为足月宝宝显示常规提示', () => {
      const fullTermAgeInfo: AgeInfo = {
        actualAge: { months: 3, days: 0 },
        correctedAge: { months: 3, days: 0 },
        correctedAgeInDays: 90,
      }

      render(<AgeDisplay {...defaultProps} ageInfo={fullTermAgeInfo} />)
      
      expect(screen.getByText('宝宝发育良好，继续关注各项里程碑的达成情况。')).toBeInTheDocument()
    })

    it('应该能够隐藏成长提示', () => {
      render(<AgeDisplay {...defaultProps} showGrowthTip={false} />)
      
      expect(screen.queryByText('成长提示:')).not.toBeInTheDocument()
      expect(screen.queryByText('💡')).not.toBeInTheDocument()
    })
  })

  describe('边界情况', () => {
    it('应该处理0天的情况', () => {
      const zeroAgeInfo: AgeInfo = {
        actualAge: { months: 2, days: 0 },
        correctedAge: { months: 1, days: 0 },
        correctedAgeInDays: 30,
      }

      render(<AgeDisplay {...defaultProps} ageInfo={zeroAgeInfo} />)
      
      // 当天数为0时，不应该显示"0天"
      expect(screen.getByText('个月')).toBeInTheDocument()
      expect(screen.queryByText('0天')).not.toBeInTheDocument()
    })

    it('应该处理0个月的情况', () => {
      const newbornAgeInfo: AgeInfo = {
        actualAge: { months: 0, days: 15 },
        correctedAge: { months: 0, days: 5 },
        correctedAgeInDays: 5,
      }

      render(<AgeDisplay {...defaultProps} ageInfo={newbornAgeInfo} />)
      
      expect(screen.getByText('0')).toBeInTheDocument()
      expect(screen.getByText('个月 15天')).toBeInTheDocument()
      expect(screen.getByText('个月 5天')).toBeInTheDocument()
    })

    it('应该处理很大的月龄', () => {
      const olderBabyAgeInfo: AgeInfo = {
        actualAge: { months: 15, days: 25 },
        correctedAge: { months: 13, days: 10 },
        correctedAgeInDays: 400,
      }

      render(<AgeDisplay {...defaultProps} ageInfo={olderBabyAgeInfo} />)
      
      expect(screen.getByText('15')).toBeInTheDocument()
      expect(screen.getByText('13')).toBeInTheDocument()
    })

    it('应该处理长宝宝姓名', () => {
      const longName = '超级无敌可爱小宝宝'
      render(<AgeDisplay {...defaultProps} babyName={longName} />)
      
      expect(screen.getByText(`宝宝 ${longName}`)).toBeInTheDocument()
    })

    it('应该处理空宝宝姓名', () => {
      render(<AgeDisplay {...defaultProps} babyName="" />)
      
      expect(screen.getByText('宝宝')).toBeInTheDocument()
    })
  })

  describe('样式和CSS类', () => {
    it('应该应用自定义className', () => {
      const { container } = render(
        <AgeDisplay {...defaultProps} className="custom-class" />
      )
      
      const ageDisplayElement = container.firstChild as HTMLElement
      expect(ageDisplayElement).toHaveClass('custom-class')
    })

    it('应该包含默认的样式类', () => {
      const { container } = render(<AgeDisplay {...defaultProps} />)
      
      const ageDisplayElement = container.firstChild as HTMLElement
      expect(ageDisplayElement).toHaveClass('bg-gradient-to-br')
      expect(ageDisplayElement).toHaveClass('rounded-2xl')
      expect(ageDisplayElement).toHaveClass('shadow-lg')
    })

    it('应该为矫正月龄使用突出的样式', () => {
      const { container } = render(<AgeDisplay {...defaultProps} />)
      
      const correctedAgeElements = container.querySelectorAll('.from-blue-500')
      expect(correctedAgeElements.length).toBeGreaterThan(0)
    })
  })

  describe('可访问性', () => {
    it('应该有正确的语义结构', () => {
      render(<AgeDisplay {...defaultProps} />)
      
      // 检查主标题
      const heading = screen.getByRole('heading', { level: 2 })
      expect(heading).toHaveTextContent('宝宝 小宝宝')
    })

    it('应该为视觉元素提供文本内容', () => {
      render(<AgeDisplay {...defaultProps} />)
      
      // 检查重要信息是否可以通过文本访问
      expect(screen.getByText('实际月龄')).toBeInTheDocument()
      expect(screen.getByText('矫正月龄 ⭐')).toBeInTheDocument()
      expect(screen.getByText('发育指导基准')).toBeInTheDocument()
    })
  })
})

describe('CompactAgeDisplay', () => {
  const mockAgeInfo: AgeInfo = {
    actualAge: { months: 3, days: 15 },
    correctedAge: { months: 2, days: 10 },
    correctedAgeInDays: 70,
  }

  const defaultProps = {
    ageInfo: mockAgeInfo,
  }

  describe('基础渲染', () => {
    it('应该显示紧凑格式的实际月龄', () => {
      render(<CompactAgeDisplay {...defaultProps} />)
      
      expect(screen.getByText('实际')).toBeInTheDocument()
      expect(screen.getByText('3月15天')).toBeInTheDocument()
    })

    it('应该显示紧凑格式的矫正月龄', () => {
      render(<CompactAgeDisplay {...defaultProps} />)
      
      expect(screen.getByText('矫正 ⭐')).toBeInTheDocument()
      expect(screen.getByText('2月10天')).toBeInTheDocument()
    })

    it('应该包含分隔线', () => {
      const { container } = render(<CompactAgeDisplay {...defaultProps} />)
      
      const separator = container.querySelector('.w-px.h-8.bg-blue-200')
      expect(separator).toBeInTheDocument()
    })
  })

  describe('边界情况', () => {
    it('应该处理0天的显示', () => {
      const zeroAgeInfo: AgeInfo = {
        actualAge: { months: 2, days: 0 },
        correctedAge: { months: 1, days: 0 },
        correctedAgeInDays: 30,
      }

      render(<CompactAgeDisplay ageInfo={zeroAgeInfo} />)
      
      expect(screen.getByText('2月0天')).toBeInTheDocument()
      expect(screen.getByText('1月0天')).toBeInTheDocument()
    })

    it('应该处理新生儿（0个月）', () => {
      const newbornAgeInfo: AgeInfo = {
        actualAge: { months: 0, days: 15 },
        correctedAge: { months: 0, days: 5 },
        correctedAgeInDays: 5,
      }

      render(<CompactAgeDisplay ageInfo={newbornAgeInfo} />)
      
      expect(screen.getByText('0月15天')).toBeInTheDocument()
      expect(screen.getByText('0月5天')).toBeInTheDocument()
    })
  })

  describe('样式和CSS类', () => {
    it('应该应用自定义className', () => {
      const { container } = render(
        <CompactAgeDisplay {...defaultProps} className="custom-compact-class" />
      )
      
      const compactElement = container.firstChild as HTMLElement
      expect(compactElement).toHaveClass('custom-compact-class')
    })

    it('应该包含默认的紧凑样式', () => {
      const { container } = render(<CompactAgeDisplay {...defaultProps} />)
      
      const compactElement = container.firstChild as HTMLElement
      expect(compactElement).toHaveClass('inline-flex')
      expect(compactElement).toHaveClass('bg-blue-50')
      expect(compactElement).toHaveClass('rounded-lg')
    })
  })

  describe('布局和响应式', () => {
    it('应该使用flex布局排列元素', () => {
      const { container } = render(<CompactAgeDisplay {...defaultProps} />)
      
      const compactElement = container.firstChild as HTMLElement
      expect(compactElement).toHaveClass('inline-flex')
      expect(compactElement).toHaveClass('items-center')
      expect(compactElement).toHaveClass('gap-3')
    })
  })

  describe('数据一致性', () => {
    it('应该准确反映传入的年龄信息', () => {
      const specificAgeInfo: AgeInfo = {
        actualAge: { months: 5, days: 22 },
        correctedAge: { months: 4, days: 8 },
        correctedAgeInDays: 128,
      }

      render(<CompactAgeDisplay ageInfo={specificAgeInfo} />)
      
      expect(screen.getByText('5月22天')).toBeInTheDocument()
      expect(screen.getByText('4月8天')).toBeInTheDocument()
    })

    it('应该与AgeDisplay组件显示一致的数据', () => {
      // 使用相同的数据渲染两个组件
      const { rerender } = render(<AgeDisplay babyName="测试宝宝" ageInfo={mockAgeInfo} />)
      
      // 验证AgeDisplay中的数据
      expect(screen.getByText('3')).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument()
      
      // 切换到CompactAgeDisplay
      rerender(<CompactAgeDisplay ageInfo={mockAgeInfo} />)
      
      // 验证CompactAgeDisplay中的数据一致
      expect(screen.getByText('3月15天')).toBeInTheDocument()
      expect(screen.getByText('2月10天')).toBeInTheDocument()
    })
  })
})