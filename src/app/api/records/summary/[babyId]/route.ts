import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { getLocalDateRange, getTodayDateString } from '@/utils/time-helpers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ babyId: string }> }
) {
  try {
    // 验证用户身份
    const session = await requireAuth();
    const { babyId } = await params;
    
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'today'; // today, week, month
    
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

    // 计算时间范围
    const now = new Date();
    let startDate: Date;
    let endDate: Date = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 明天开始，确保包含今天

    switch (period) {
      case 'today':
        const today = getTodayDateString();
        const todayRange = getLocalDateRange(today);
        startDate = todayRange.start;
        endDate = todayRange.end;
        break;
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        startDate = new Date(weekAgo.getFullYear(), weekAgo.getMonth(), weekAgo.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        break;
      case 'month':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        startDate = new Date(monthAgo.getFullYear(), monthAgo.getMonth(), monthAgo.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        break;
      default:
        return NextResponse.json(
          { 
            success: false,
            error: '无效的时间周期参数',
            code: 'INVALID_PERIOD'
          },
          { status: 400 }
        );
    }

    // 查询时间范围条件
    const timeCondition = {
      timestamp: {
        gte: startDate,
        lte: endDate,
      }
    };

    // 并行查询所有记录类型
    const [feedingRecords, sleepRecords, completedMilestones] = await Promise.all([
      // 喂养记录
      prisma.feedingRecord.findMany({
        where: {
          babyId: babyId,
          ...timeCondition,
        },
        orderBy: { timestamp: 'desc' }
      }),
      
      // 睡眠记录
      prisma.sleepRecord.findMany({
        where: {
          babyId: babyId,
          ...timeCondition,
        },
        orderBy: { timestamp: 'desc' }
      }),

      // 完成的里程碑记录
      prisma.babyMilestone.findMany({
        where: {
          babyId: babyId,
          achievedAt: {
            gte: startDate,
            lte: endDate,
          }
        },
        include: {
          milestone: true
        },
        orderBy: { achievedAt: 'desc' }
      })
    ]);

    // 计算喂养统计
    const feedingStats = {
      total: feedingRecords.length,
      byType: {
        breast: feedingRecords.filter(r => r.type === 'breast').length,
        formula: feedingRecords.filter(r => r.type === 'formula').length,
        solid: feedingRecords.filter(r => r.type === 'solid').length,
      },
      totalVolume: 0, // 配方奶总量(ml)
      totalDuration: 0, // 母乳喂养总时长(分钟)
      averageInterval: 0, // 平均喂养间隔(分钟)
      lastFeedingTime: feedingRecords.length > 0 ? feedingRecords[0].timestamp.toISOString() : null,
    };

    // 计算配方奶总量和母乳总时长
    feedingRecords.forEach(record => {
      const value = parseFloat(record.amountOrDuration) || 0;
      if (record.type === 'formula' || record.type === 'solid') {
        feedingStats.totalVolume += value;
      } else if (record.type === 'breast') {
        feedingStats.totalDuration += value;
      }
    });

    // 计算平均喂养间隔
    if (feedingRecords.length > 1) {
      const intervals: number[] = [];
      for (let i = 0; i < feedingRecords.length - 1; i++) {
        const current = feedingRecords[i].timestamp.getTime();
        const next = feedingRecords[i + 1].timestamp.getTime();
        intervals.push((current - next) / (1000 * 60)); // 转换为分钟
      }
      feedingStats.averageInterval = Math.round(intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length);
    }

    // 计算睡眠统计
    const sleepStats = {
      total: sleepRecords.length,
      totalDuration: sleepRecords.reduce((sum, record) => sum + record.durationMinutes, 0),
      averageDuration: 0,
      longestSleep: 0,
      shortestSleep: 0,
      lastSleepTime: sleepRecords.length > 0 ? sleepRecords[0].endTime.toISOString() : null,
      nightSleepDuration: 0, // 夜间睡眠时长
      daySleepDuration: 0, // 白天睡眠时长
    };

    if (sleepRecords.length > 0) {
      const durations = sleepRecords.map(r => r.durationMinutes);
      sleepStats.averageDuration = Math.round(sleepStats.totalDuration / sleepRecords.length);
      sleepStats.longestSleep = Math.max(...durations);
      sleepStats.shortestSleep = Math.min(...durations);

      // 计算白天和夜间睡眠（简单判断：晚8点到早6点为夜间）
      sleepRecords.forEach(record => {
        const startHour = record.startTime.getHours();
        const endHour = record.endTime.getHours();
        
        // 如果睡眠时间跨夜间时段，算作夜间睡眠
        if (startHour >= 20 || endHour <= 6 || (startHour <= 6 && endHour <= 6)) {
          sleepStats.nightSleepDuration += record.durationMinutes;
        } else {
          sleepStats.daySleepDuration += record.durationMinutes;
        }
      });
    }

    // 里程碑统计
    const milestoneStats = {
      completed: completedMilestones.length,
      byCategory: {
        motor: completedMilestones.filter(m => m.milestone.category === 'motor').length,
        cognitive: completedMilestones.filter(m => m.milestone.category === 'cognitive').length,
        social: completedMilestones.filter(m => m.milestone.category === 'social').length,
        language: completedMilestones.filter(m => m.milestone.category === 'language').length,
      },
      recent: completedMilestones.slice(0, 5).map(m => ({
        id: m.id,
        title: m.milestone.title,
        category: m.milestone.category,
        achievedAt: m.achievedAt?.toISOString(),
        correctedAgeAtAchievement: m.correctedAgeAtAchievement
      }))
    };

    // 计算活动频率（每日平均）
    const periodDays = period === 'today' ? 1 : 
                     period === 'week' ? 7 : 30;
    
    const activityFrequency = {
      feedingsPerDay: Math.round((feedingStats.total / periodDays) * 10) / 10,
      sleepsPerDay: Math.round((sleepStats.total / periodDays) * 10) / 10,
      sleepHoursPerDay: Math.round((sleepStats.totalDuration / 60 / periodDays) * 10) / 10,
      milestonesPerDay: Math.round((milestoneStats.completed / periodDays) * 10) / 10,
    };

    // 健康指标（基于推荐标准的简单评估）
    const healthIndicators = {
      feedingFrequency: {
        status: feedingStats.total === 0 ? 'unknown' : 
               (feedingStats.total / periodDays >= 6 ? 'good' : 
                feedingStats.total / periodDays >= 4 ? 'fair' : 'concerning'),
        value: activityFrequency.feedingsPerDay,
        recommendation: '新生儿建议每日喂养6-8次'
      },
      sleepDuration: {
        status: sleepStats.totalDuration === 0 ? 'unknown' :
               (sleepStats.totalDuration / periodDays >= 480 ? 'good' : // 8小时
                sleepStats.totalDuration / periodDays >= 360 ? 'fair' : 'concerning'), // 6小时
        value: activityFrequency.sleepHoursPerDay,
        recommendation: '婴儿建议每日睡眠时间12-16小时'
      },
      developmentProgress: {
        status: milestoneStats.completed > 0 ? 'good' : 'fair',
        value: milestoneStats.completed,
        recommendation: '定期完成适龄里程碑有助于健康发展'
      }
    };

    return NextResponse.json({
      success: true,
      data: {
        baby: {
          id: baby.id,
          name: baby.name,
        },
        period: period,
        dateRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },
        summary: {
          feeding: feedingStats,
          sleep: sleepStats,
          milestones: milestoneStats,
          activityFrequency: activityFrequency,
          healthIndicators: healthIndicators,
        },
        totals: {
          records: feedingRecords.length + sleepRecords.length,
          activities: feedingRecords.length + sleepRecords.length + completedMilestones.length,
        }
      }
    });

  } catch (error) {
    console.error('Get records summary error:', error);
    
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
        error: '获取记录统计失败，请稍后重试',
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
}