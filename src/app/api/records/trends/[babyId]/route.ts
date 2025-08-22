import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { getLocalDateRange } from '@/utils/time-helpers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ babyId: string }> }
) {
  try {
    // 验证用户身份
    const session = await requireAuth();
    const { babyId } = await params;
    
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '7'; // 默认7天
    const type = searchParams.get('type') || 'all'; // all, feeding, sleep
    
    // 验证宝宝归属
    const baby = await prisma.baby.findFirst({
      where: {
        id: babyId,
        userId: session.userId as string,
      },
    });

    if (!baby) {
      return NextResponse.json(
        { 
          success: false,
          error: '找不到宝宝档案',
          code: 'BABY_NOT_FOUND'
        },
        { status: 404 }
      );
    }

    const days = parseInt(period);
    if (isNaN(days) || days < 1 || days > 90) {
      return NextResponse.json(
        { 
          success: false,
          error: '无效的天数参数，支持1-90天',
          code: 'INVALID_PERIOD'
        },
        { status: 400 }
      );
    }

    // 计算日期范围
    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    
    // 生成日期序列
    const datePoints: string[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      datePoints.push(date.toISOString().split('T')[0]); // YYYY-MM-DD
    }

    // 并行查询数据
    const promises = [];
    
    if (type === 'all' || type === 'feeding') {
      promises.push(
        prisma.feedingRecord.findMany({
          where: {
            babyId: babyId,
            timestamp: {
              gte: startDate,
              lte: now,
            }
          },
          orderBy: { timestamp: 'asc' }
        })
      );
    } else {
      promises.push(Promise.resolve([]));
    }

    if (type === 'all' || type === 'sleep') {
      promises.push(
        prisma.sleepRecord.findMany({
          where: {
            babyId: babyId,
            timestamp: {
              gte: startDate,
              lte: now,
            }
          },
          orderBy: { timestamp: 'asc' }
        })
      );
    } else {
      promises.push(Promise.resolve([]));
    }

    const [feedingRecords, sleepRecords] = await Promise.all(promises);

    // 按日期分组数据
    const dailyStats = datePoints.map(dateStr => {
      const { start: dayStart, end: dayEnd } = getLocalDateRange(dateStr);
      
      // 筛选当天的记录
      interface FeedingRecord {
        id: string;
        type: string;
        amountOrDuration: string;
        timestamp: Date;
      }
      
      interface SleepRecord {
        id: string;
        durationMinutes: number;
        timestamp: Date;
      }

      const dayFeedingRecords = (feedingRecords as FeedingRecord[]).filter((record) => 
        record.timestamp >= dayStart && record.timestamp <= dayEnd
      );
      
      const daySleepRecords = (sleepRecords as SleepRecord[]).filter((record) => 
        record.timestamp >= dayStart && record.timestamp <= dayEnd
      );

      // 计算当天的喂养统计
      const feedingStats = {
        total: dayFeedingRecords.length,
        breast: dayFeedingRecords.filter((r) => r.type === 'breast').length,
        formula: dayFeedingRecords.filter((r) => r.type === 'formula').length,
        solid: dayFeedingRecords.filter((r) => r.type === 'solid').length,
        totalVolume: 0,
        totalDuration: 0,
      };

      dayFeedingRecords.forEach((record) => {
        const value = parseFloat(record.amountOrDuration) || 0;
        if (record.type === 'formula' || record.type === 'solid') {
          feedingStats.totalVolume += value;
        } else if (record.type === 'breast') {
          feedingStats.totalDuration += value;
        }
      });

      // 计算当天的睡眠统计
      const sleepStats = {
        total: daySleepRecords.length,
        totalDuration: daySleepRecords.reduce((sum: number, record) => sum + record.durationMinutes, 0),
        averageDuration: 0,
        longestSleep: daySleepRecords.length > 0 ? Math.max(...daySleepRecords.map((r) => r.durationMinutes)) : 0,
      };

      if (daySleepRecords.length > 0) {
        sleepStats.averageDuration = Math.round(sleepStats.totalDuration / daySleepRecords.length);
      }

      return {
        date: dateStr,
        feeding: feedingStats,
        sleep: sleepStats,
      };
    });

    // 计算趋势指标
    const calculateTrend = (values: number[]) => {
      if (values.length < 2) return { direction: 'stable', change: 0 };
      
      const recent = values.slice(-3); // 最近3天
      const earlier = values.slice(-6, -3); // 之前3天
      
      if (recent.length === 0 || earlier.length === 0) return { direction: 'stable', change: 0 };
      
      const recentAvg = recent.reduce((sum, val) => sum + val, 0) / recent.length;
      const earlierAvg = earlier.reduce((sum, val) => sum + val, 0) / earlier.length;
      
      const change = ((recentAvg - earlierAvg) / Math.max(earlierAvg, 1)) * 100;
      
      let direction = 'stable';
      if (change > 10) direction = 'increasing';
      else if (change < -10) direction = 'decreasing';
      
      return { direction, change: Math.round(change * 10) / 10 };
    };

    // 分析趋势
    const trends = {
      feeding: {
        frequency: calculateTrend(dailyStats.map(d => d.feeding.total)),
        volume: calculateTrend(dailyStats.map(d => d.feeding.totalVolume)),
        duration: calculateTrend(dailyStats.map(d => d.feeding.totalDuration)),
      },
      sleep: {
        frequency: calculateTrend(dailyStats.map(d => d.sleep.total)),
        totalDuration: calculateTrend(dailyStats.map(d => d.sleep.totalDuration)),
        averageDuration: calculateTrend(dailyStats.map(d => d.sleep.averageDuration)),
      }
    };

    // 计算汇总统计
    const summaryStats = {
      feeding: {
        avgPerDay: Math.round((dailyStats.reduce((sum, d) => sum + d.feeding.total, 0) / days) * 10) / 10,
        avgVolumePerDay: Math.round((dailyStats.reduce((sum, d) => sum + d.feeding.totalVolume, 0) / days) * 10) / 10,
        avgDurationPerDay: Math.round((dailyStats.reduce((sum, d) => sum + d.feeding.totalDuration, 0) / days) * 10) / 10,
        mostCommonType: (() => {
          const totalBreast = dailyStats.reduce((sum, d) => sum + d.feeding.breast, 0);
          const totalFormula = dailyStats.reduce((sum, d) => sum + d.feeding.formula, 0);
          const totalSolid = dailyStats.reduce((sum, d) => sum + d.feeding.solid, 0);
          
          if (totalBreast >= totalFormula && totalBreast >= totalSolid) return 'breast';
          if (totalFormula >= totalSolid) return 'formula';
          return 'solid';
        })(),
      },
      sleep: {
        avgPerDay: Math.round((dailyStats.reduce((sum, d) => sum + d.sleep.total, 0) / days) * 10) / 10,
        avgHoursPerDay: Math.round((dailyStats.reduce((sum, d) => sum + d.sleep.totalDuration, 0) / days / 60) * 10) / 10,
        avgSleepDuration: Math.round((dailyStats.reduce((sum, d) => sum + d.sleep.averageDuration, 0) / days) * 10) / 10,
        longestSleep: Math.max(...dailyStats.map(d => d.sleep.longestSleep)),
      }
    };

    // 生成趋势图表数据
    const chartData = {
      labels: datePoints,
      datasets: []
    };

    if (type === 'all' || type === 'feeding') {
      chartData.datasets.push(
        {
          label: '每日喂养次数',
          data: dailyStats.map(d => d.feeding.total),
          type: 'feeding_frequency',
        },
        {
          label: '每日配方奶量(ml)',
          data: dailyStats.map(d => d.feeding.totalVolume),
          type: 'feeding_volume',
        }
      );
    }

    if (type === 'all' || type === 'sleep') {
      chartData.datasets.push(
        {
          label: '每日睡眠次数',
          data: dailyStats.map(d => d.sleep.total),
          type: 'sleep_frequency',
        },
        {
          label: '每日睡眠时长(小时)',
          data: dailyStats.map(d => Math.round(d.sleep.totalDuration / 60 * 10) / 10),
          type: 'sleep_duration',
        }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        baby: {
          id: baby.id,
          name: baby.name,
        },
        period: days,
        type: type,
        dateRange: {
          start: startDate.toISOString(),
          end: now.toISOString(),
        },
        dailyStats: dailyStats,
        trends: trends,
        summary: summaryStats,
        chartData: chartData,
        insights: {
          feedingPattern: trends.feeding.frequency.direction === 'increasing' ? 
            '喂养频率呈上升趋势' : trends.feeding.frequency.direction === 'decreasing' ? 
            '喂养频率呈下降趋势' : '喂养频率相对稳定',
          sleepPattern: trends.sleep.totalDuration.direction === 'increasing' ? 
            '睡眠时长呈上升趋势' : trends.sleep.totalDuration.direction === 'decreasing' ? 
            '睡眠时长呈下降趋势' : '睡眠时长相对稳定',
          recommendations: generateRecommendations(summaryStats, trends)
        }
      }
    });

  } catch (error) {
    console.error('Get records trends error:', error);
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { 
          success: false,
          error: '请先登录',
          code: 'UNAUTHORIZED'
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { 
        success: false,
        error: '获取趋势数据失败，请稍后重试',
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
}

// 生成个性化建议
interface SummaryStats {
  feeding: {
    avgPerDay: number;
  };
  sleep: {
    avgHoursPerDay: number;
    avgSleepDuration: number;
  };
}

interface Trends {
  feeding: {
    frequency: {
      direction: string;
      change: number;
    };
  };
  sleep: {
    totalDuration: {
      direction: string;
      change: number;
    };
  };
}

function generateRecommendations(summaryStats: SummaryStats, trends: Trends): string[] {
  const recommendations: string[] = [];

  // 喂养建议
  if (summaryStats.feeding.avgPerDay < 6) {
    recommendations.push('建议增加喂养频率，新生儿每日喂养6-8次较为理想');
  } else if (summaryStats.feeding.avgPerDay > 12) {
    recommendations.push('喂养频率较高，可适当延长喂养间隔或咨询医生');
  }

  if (trends.feeding.frequency.direction === 'decreasing' && trends.feeding.frequency.change < -20) {
    recommendations.push('注意到喂养频率明显下降，请关注宝宝的生长发育');
  }

  // 睡眠建议
  if (summaryStats.sleep.avgHoursPerDay < 12) {
    recommendations.push('睡眠时间偏少，婴儿建议每日睡眠12-16小时');
  } else if (summaryStats.sleep.avgHoursPerDay > 18) {
    recommendations.push('睡眠时间较长，注意观察宝宝的精神状态和发育情况');
  }

  if (summaryStats.sleep.avgSleepDuration < 60) {
    recommendations.push('单次睡眠时间较短，可尝试改善睡眠环境');
  }

  // 趋势建议
  if (trends.sleep.totalDuration.direction === 'decreasing' && trends.sleep.totalDuration.change < -15) {
    recommendations.push('睡眠时长呈下降趋势，建议观察是否有不适症状');
  }

  // 如果没有特殊建议，提供通用建议
  if (recommendations.length === 0) {
    recommendations.push('记录数据表现良好，继续保持规律的作息和喂养习惯');
  }

  return recommendations;
}