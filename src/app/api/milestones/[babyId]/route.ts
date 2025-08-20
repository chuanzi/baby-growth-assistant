import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { calculateAge } from '@/utils/age-calculator';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ babyId: string }> }
) {
  try {
    // 验证用户身份
    const session = await requireAuth();
    
    const { babyId } = await params;
    
    // 验证宝宝归属
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

    // 计算宝宝的矫正月龄
    const ageInfo = calculateAge(baby);
    const correctedAgeInDays = ageInfo.correctedAgeInDays;

    // 获取适合当前矫正月龄的里程碑（包括已完成和待完成的）
    const relevantMilestones = await prisma.milestone.findMany({
      where: {
        AND: [
          { ageRangeMin: { lte: correctedAgeInDays + 60 } }, // 包含未来2个月的里程碑
          { ageRangeMax: { gte: correctedAgeInDays - 30 } }  // 包含过去1个月的里程碑
        ]
      },
      include: {
        babyMilestones: {
          where: {
            babyId: babyId
          }
        }
      },
      orderBy: [
        { ageRangeMin: 'asc' },
        { category: 'asc' }
      ]
    });

    // 格式化返回数据
    const milestonesWithStatus = relevantMilestones.map(milestone => {
      const babyMilestone = milestone.babyMilestones[0];
      const isInCurrentRange = correctedAgeInDays >= milestone.ageRangeMin && 
                              correctedAgeInDays <= milestone.ageRangeMax;
      
      return {
        id: milestone.id,
        title: milestone.title,
        description: milestone.description,
        category: milestone.category,
        ageRangeMin: milestone.ageRangeMin,
        ageRangeMax: milestone.ageRangeMax,
        isCompleted: !!babyMilestone?.achievedAt,
        achievedAt: babyMilestone?.achievedAt,
        correctedAgeAtAchievement: babyMilestone?.correctedAgeAtAchievement,
        isInCurrentRange,
        isPriority: isInCurrentRange || (correctedAgeInDays >= milestone.ageRangeMin - 30)
      };
    });

    // 按状态分组
    const completed = milestonesWithStatus.filter(m => m.isCompleted);
    const inProgress = milestonesWithStatus.filter(m => !m.isCompleted && m.isInCurrentRange);
    const upcoming = milestonesWithStatus.filter(m => !m.isCompleted && !m.isInCurrentRange && m.isPriority);

    return NextResponse.json({
      success: true,
      data: {
        baby: {
          id: baby.id,
          name: baby.name,
          correctedAgeInDays,
          correctedAge: ageInfo.correctedAge
        },
        milestones: {
          completed,
          inProgress,
          upcoming,
          total: milestonesWithStatus.length
        },
        statistics: {
          completedCount: completed.length,
          inProgressCount: inProgress.length,
          upcomingCount: upcoming.length
        }
      }
    });

  } catch (error) {
    console.error('Get milestones error:', error);
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: '获取里程碑失败，请稍后重试' },
      { status: 500 }
    );
  }
}

// 标记里程碑为完成
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ babyId: string }> }
) {
  try {
    // 验证用户身份
    const session = await requireAuth();
    
    const { babyId } = await params;
    
    // 验证宝宝归属
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

    const body = await request.json();
    const { milestoneId, achieved } = body;

    if (!milestoneId || typeof achieved !== 'boolean') {
      return NextResponse.json(
        { error: '参数不正确' },
        { status: 400 }
      );
    }

    // 验证里程碑是否存在
    const milestone = await prisma.milestone.findUnique({
      where: { id: milestoneId }
    });

    if (!milestone) {
      return NextResponse.json(
        { error: '找不到指定的里程碑' },
        { status: 404 }
      );
    }

    const ageInfo = calculateAge(baby);
    
    if (achieved) {
      // 标记为完成
      const babyMilestone = await prisma.babyMilestone.upsert({
        where: {
          babyId_milestoneId: {
            babyId: babyId,
            milestoneId: milestoneId
          }
        },
        update: {
          achievedAt: new Date(),
          correctedAgeAtAchievement: ageInfo.correctedAgeInDays
        },
        create: {
          babyId: babyId,
          milestoneId: milestoneId,
          achievedAt: new Date(),
          correctedAgeAtAchievement: ageInfo.correctedAgeInDays
        }
      });

      return NextResponse.json({
        success: true,
        message: '里程碑标记完成',
        data: babyMilestone
      });
    } else {
      // 取消完成状态
      await prisma.babyMilestone.upsert({
        where: {
          babyId_milestoneId: {
            babyId: babyId,
            milestoneId: milestoneId
          }
        },
        update: {
          achievedAt: null,
          correctedAgeAtAchievement: null
        },
        create: {
          babyId: babyId,
          milestoneId: milestoneId,
          achievedAt: null,
          correctedAgeAtAchievement: null
        }
      });

      return NextResponse.json({
        success: true,
        message: '取消里程碑完成状态'
      });
    }

  } catch (error) {
    console.error('Update milestone error:', error);
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: '更新里程碑状态失败，请稍后重试' },
      { status: 500 }
    );
  }
}