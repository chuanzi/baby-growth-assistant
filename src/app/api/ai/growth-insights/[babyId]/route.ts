import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { aiContentGenerator } from '@/lib/ai';
import { rateLimiter, createRateLimitResponse } from '@/lib/rate-limiter';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ babyId: string }> }
) {
  try {
    // 验证用户身份
    const session = await requireAuth();
    const userId = session.userId as string;
    
    // 检查请求频率限制
    const rateLimitCheck = rateLimiter.checkAIInsights(userId);
    if (!rateLimitCheck.allowed) {
      return createRateLimitResponse(rateLimitCheck);
    }
    
    const { babyId } = await params;
    
    // 获取宝宝信息，确保属于当前用户
    const baby = await prisma.baby.findFirst({
      where: {
        id: babyId,
        userId: session.userId as string,
      },
    });

    if (!baby) {
      return NextResponse.json(
        { error: '找不到宝宝档案' },
        { status: 404 }
      );
    }

    // 获取过去30天的数据进行分析
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const feedingRecords = await prisma.feedingRecord.findMany({
      where: {
        babyId: babyId,
        timestamp: {
          gte: thirtyDaysAgo
        }
      },
      orderBy: { timestamp: 'desc' },
      take: 50, // 最多50条记录
    });

    const sleepRecords = await prisma.sleepRecord.findMany({
      where: {
        babyId: babyId,
        timestamp: {
          gte: thirtyDaysAgo
        }
      },
      orderBy: { timestamp: 'desc' },
      take: 30, // 最多30条记录
    });

    const milestones = await prisma.babyMilestone.findMany({
      where: {
        babyId: babyId,
        achievedAt: {
          not: null
        }
      },
      include: {
        milestone: true
      },
      orderBy: { achievedAt: 'desc' },
    });

    // 生成AI洞察分析
    const insights = await aiContentGenerator.generateGrowthInsights(
      baby,
      feedingRecords,
      sleepRecords,
      milestones
    );

    // 计算一些基础统计数据
    const stats = {
      feedingRecordsCount: feedingRecords.length,
      sleepRecordsCount: sleepRecords.length,
      milestonesCount: milestones.length,
      dataRange: {
        from: thirtyDaysAgo.toISOString(),
        to: new Date().toISOString()
      },
      averageDailyFeedings: Math.round((feedingRecords.length / 30) * 10) / 10,
      averageDailySleep: sleepRecords.length > 0 
        ? Math.round((sleepRecords.reduce((sum, s) => sum + s.durationMinutes, 0) / 30) / 60 * 10) / 10
        : 0,
      recentMilestones: milestones
        .filter(m => m.achievedAt && (Date.now() - new Date(m.achievedAt).getTime()) < 7 * 24 * 60 * 60 * 1000)
        .length
    };

    return NextResponse.json({
      success: true,
      data: {
        baby: {
          id: baby.id,
          name: baby.name
        },
        insights,
        statistics: stats,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Generate growth insights error:', error);
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: '生成成长洞察失败，请稍后重试' },
      { status: 500 }
    );
  }
}