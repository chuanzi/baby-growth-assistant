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
        { 
          success: false,
          error: '找不到宝宝档案',
          code: 'BABY_NOT_FOUND'
        },
        { status: 404 }
      );
    }

    // 计算宝宝的当前矫正月龄
    const ageInfo = calculateAge(baby);
    const correctedAgeInDays = ageInfo.correctedAgeInDays;

    // 获取所有相关里程碑（包括过去、当前和未来的）
    const allMilestones = await prisma.milestone.findMany({
      where: {
        ageRangeMax: {
          gte: Math.max(0, correctedAgeInDays - 90) // 包含过去3个月的里程碑
        }
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

    // 统计各类里程碑数量
    const milestoneStats = {
      total: allMilestones.length,
      completed: 0,
      inProgress: 0,
      upcoming: 0,
      overdue: 0,
      categoryBreakdown: {
        motor: { total: 0, completed: 0 },
        cognitive: { total: 0, completed: 0 },
        social: { total: 0, completed: 0 },
        language: { total: 0, completed: 0 }
      }
    };

    interface MilestoneData {
      id: string;
      title: string;
      description: string;
      category: string;
      ageRangeMin: number;
      ageRangeMax: number;
      isCompleted: boolean;
      achievedAt?: string;
      correctedAgeAtAchievement?: number | null;
      daysFromTarget: number;
    }

    const milestonesByStatus = {
      completed: [] as MilestoneData[],
      inProgress: [] as MilestoneData[],
      upcoming: [] as MilestoneData[],
      overdue: [] as MilestoneData[]
    };

    allMilestones.forEach(milestone => {
      const babyMilestone = milestone.babyMilestones[0];
      const isCompleted = !!babyMilestone?.achievedAt;
      const isInRange = correctedAgeInDays >= milestone.ageRangeMin && correctedAgeInDays <= milestone.ageRangeMax;
      const isOverdue = correctedAgeInDays > milestone.ageRangeMax && !isCompleted;
      const isUpcoming = correctedAgeInDays < milestone.ageRangeMin;

      // 更新分类统计
      milestoneStats.categoryBreakdown[milestone.category as keyof typeof milestoneStats.categoryBreakdown].total++;
      
      const milestoneData = {
        id: milestone.id,
        title: milestone.title,
        description: milestone.description,
        category: milestone.category,
        ageRangeMin: milestone.ageRangeMin,
        ageRangeMax: milestone.ageRangeMax,
        isCompleted,
        achievedAt: babyMilestone?.achievedAt?.toISOString(),
        correctedAgeAtAchievement: babyMilestone?.correctedAgeAtAchievement,
        daysFromTarget: correctedAgeInDays - Math.floor((milestone.ageRangeMin + milestone.ageRangeMax) / 2)
      };

      if (isCompleted) {
        milestoneStats.completed++;
        milestoneStats.categoryBreakdown[milestone.category as keyof typeof milestoneStats.categoryBreakdown].completed++;
        milestonesByStatus.completed.push(milestoneData);
      } else if (isOverdue) {
        milestoneStats.overdue++;
        milestonesByStatus.overdue.push(milestoneData);
      } else if (isInRange) {
        milestoneStats.inProgress++;
        milestonesByStatus.inProgress.push(milestoneData);
      } else if (isUpcoming) {
        milestoneStats.upcoming++;
        milestonesByStatus.upcoming.push(milestoneData);
      }
    });

    // 计算各分类完成百分比
    const categoryProgress = Object.entries(milestoneStats.categoryBreakdown).map(([category, stats]) => ({
      category,
      total: stats.total,
      completed: stats.completed,
      percentage: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0
    }));

    // 计算总体进度百分比
    const overallProgress = milestoneStats.total > 0 
      ? Math.round((milestoneStats.completed / milestoneStats.total) * 100) 
      : 0;

    // 获取最近完成的里程碑（最近7天）
    const recentlyCompleted = await prisma.babyMilestone.findMany({
      where: {
        babyId: babyId,
        achievedAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7天前
        }
      },
      include: {
        milestone: true
      },
      orderBy: {
        achievedAt: 'desc'
      },
      take: 5
    });

    // 获取下一个重要里程碑（最接近当前月龄的未完成里程碑）
    const nextMilestones = milestonesByStatus.inProgress
      .concat(milestonesByStatus.upcoming.filter(m => m.ageRangeMin - correctedAgeInDays <= 30)) // 未来30天内的
      .sort((a, b) => Math.abs(a.daysFromTarget) - Math.abs(b.daysFromTarget))
      .slice(0, 3);

    return NextResponse.json({
      success: true,
      data: {
        baby: {
          id: baby.id,
          name: baby.name,
          correctedAge: ageInfo.correctedAge,
          correctedAgeInDays: correctedAgeInDays
        },
        progress: {
          overall: {
            percentage: overallProgress,
            completed: milestoneStats.completed,
            total: milestoneStats.total,
            inProgress: milestoneStats.inProgress,
            upcoming: milestoneStats.upcoming,
            overdue: milestoneStats.overdue
          },
          byCategory: categoryProgress,
          milestonesByStatus: {
            completed: milestonesByStatus.completed.slice(0, 10), // 最近完成的10个
            inProgress: milestonesByStatus.inProgress,
            upcoming: milestonesByStatus.upcoming.slice(0, 10), // 即将到来的10个
            overdue: milestonesByStatus.overdue
          },
          recentlyCompleted: recentlyCompleted.map(bm => ({
            id: bm.id,
            milestoneId: bm.milestoneId,
            title: bm.milestone.title,
            category: bm.milestone.category,
            achievedAt: bm.achievedAt?.toISOString(),
            correctedAgeAtAchievement: bm.correctedAgeAtAchievement
          })),
          nextMilestones: nextMilestones
        }
      }
    });

  } catch (error) {
    console.error('Get milestone progress error:', error);
    
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
        error: '获取里程碑进度失败，请稍后重试',
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
}