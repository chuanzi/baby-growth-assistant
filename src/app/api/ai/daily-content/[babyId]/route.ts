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
    const rateLimitCheck = rateLimiter.checkAIDailyContent(userId);
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

    // 获取最近的记录数据
    const recentFeeding = await prisma.feedingRecord.findMany({
      where: {
        babyId: babyId,
        timestamp: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // 最近24小时
        }
      },
      orderBy: { timestamp: 'desc' },
      take: 10,
    });

    const recentSleep = await prisma.sleepRecord.findMany({
      where: {
        babyId: babyId,
        timestamp: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // 最近24小时
        }
      },
      orderBy: { timestamp: 'desc' },
      take: 5,
    });

    const completedMilestones = await prisma.babyMilestone.findMany({
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
      take: 10,
    });

    // 生成AI内容
    const content = await aiContentGenerator.generateDailyCard(
      baby,
      recentFeeding,
      recentSleep,
      completedMilestones
    );

    return NextResponse.json({
      success: true,
      content,
    });

  } catch (error) {
    console.error('Generate daily content error:', error);
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: '生成内容失败，请稍后重试' },
      { status: 500 }
    );
  }
}