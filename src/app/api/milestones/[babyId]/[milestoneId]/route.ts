import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ babyId: string; milestoneId: string }> }
) {
  try {
    // 验证用户身份
    const session = await requireAuth();
    const { babyId, milestoneId } = await params;
    
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

    // 验证里程碑是否存在
    const milestone = await prisma.milestone.findUnique({
      where: { id: milestoneId }
    });

    if (!milestone) {
      return NextResponse.json(
        { 
          success: false,
          error: '找不到指定的里程碑',
          code: 'MILESTONE_NOT_FOUND'
        },
        { status: 404 }
      );
    }

    // 查找宝宝里程碑记录
    const existingRecord = await prisma.babyMilestone.findUnique({
      where: {
        babyId_milestoneId: {
          babyId: babyId,
          milestoneId: milestoneId
        }
      },
      include: {
        milestone: true
      }
    });

    if (!existingRecord || !existingRecord.achievedAt) {
      return NextResponse.json(
        { 
          success: false,
          error: '该里程碑尚未完成，无法取消',
          code: 'MILESTONE_NOT_COMPLETED'
        },
        { status: 400 }
      );
    }
    
    // 取消里程碑完成状态
    const updatedRecord = await prisma.babyMilestone.update({
      where: {
        babyId_milestoneId: {
          babyId: babyId,
          milestoneId: milestoneId
        }
      },
      data: {
        achievedAt: null,
        correctedAgeAtAchievement: null
      },
      include: {
        milestone: true
      }
    });

    return NextResponse.json({
      success: true,
      message: '取消里程碑完成状态',
      data: {
        milestone: {
          id: updatedRecord.id,
          milestoneId: updatedRecord.milestoneId,
          babyId: updatedRecord.babyId,
          achievedAt: null,
          correctedAgeAtAchievement: null,
          title: updatedRecord.milestone.title,
          description: updatedRecord.milestone.description,
          category: updatedRecord.milestone.category
        }
      }
    });

  } catch (error) {
    console.error('Cancel milestone error:', error);
    
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
        error: '取消里程碑失败，请稍后重试',
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
}

// 获取单个里程碑详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ babyId: string; milestoneId: string }> }
) {
  try {
    // 验证用户身份
    const session = await requireAuth();
    const { babyId, milestoneId } = await params;
    
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

    // 获取里程碑详情
    const milestone = await prisma.milestone.findUnique({
      where: { id: milestoneId },
      include: {
        babyMilestones: {
          where: { babyId: babyId },
          take: 1
        }
      }
    });

    if (!milestone) {
      return NextResponse.json(
        { 
          success: false,
          error: '找不到指定的里程碑',
          code: 'MILESTONE_NOT_FOUND'
        },
        { status: 404 }
      );
    }

    const babyMilestone = milestone.babyMilestones[0];

    return NextResponse.json({
      success: true,
      data: {
        milestone: {
          id: milestone.id,
          title: milestone.title,
          description: milestone.description,
          category: milestone.category,
          ageRangeMin: milestone.ageRangeMin,
          ageRangeMax: milestone.ageRangeMax,
          isCompleted: !!babyMilestone?.achievedAt,
          achievedAt: babyMilestone?.achievedAt?.toISOString(),
          correctedAgeAtAchievement: babyMilestone?.correctedAgeAtAchievement,
        }
      }
    });

  } catch (error) {
    console.error('Get milestone detail error:', error);
    
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
        error: '获取里程碑详情失败，请稍后重试',
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
}