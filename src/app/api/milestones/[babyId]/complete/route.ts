import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { calculateAge } from '@/utils/age-calculator';
import { z } from 'zod';

// 里程碑完成验证 schema
const milestoneCompleteSchema = z.object({
  milestoneId: z.string().min(1, '里程碑ID不能为空'),
  achievedAt: z.string().datetime().optional(), // ISO 日期字符串，可选，默认为当前时间
  notes: z.string().max(500, '备注不能超过500字符').optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ babyId: string }> }
) {
  try {
    // 验证用户身份
    const session = await requireAuth();
    const { babyId } = await params;
    
    // 解析请求数据
    const body = await request.json();
    const validatedData = milestoneCompleteSchema.parse(body);
    
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
      where: { id: validatedData.milestoneId }
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

    // 计算完成时的矫正月龄
    const achievedAtDate = validatedData.achievedAt ? new Date(validatedData.achievedAt) : new Date();
    const ageInfo = calculateAge(baby, achievedAtDate);
    
    // 标记里程碑为完成
    const babyMilestone = await prisma.babyMilestone.upsert({
      where: {
        babyId_milestoneId: {
          babyId: babyId,
          milestoneId: validatedData.milestoneId
        }
      },
      update: {
        achievedAt: achievedAtDate,
        correctedAgeAtAchievement: ageInfo.correctedAgeInDays
      },
      create: {
        babyId: babyId,
        milestoneId: validatedData.milestoneId,
        achievedAt: achievedAtDate,
        correctedAgeAtAchievement: ageInfo.correctedAgeInDays
      },
      include: {
        milestone: true
      }
    });

    return NextResponse.json({
      success: true,
      message: '里程碑标记完成',
      data: {
        milestone: {
          id: babyMilestone.id,
          milestoneId: babyMilestone.milestoneId,
          babyId: babyMilestone.babyId,
          achievedAt: babyMilestone.achievedAt?.toISOString(),
          correctedAgeAtAchievement: babyMilestone.correctedAgeAtAchievement,
          title: babyMilestone.milestone.title,
          description: babyMilestone.milestone.description,
          category: babyMilestone.milestone.category
        }
      }
    });

  } catch (error) {
    console.error('Complete milestone error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false,
          error: error.issues[0]?.message || '参数验证失败',
          code: 'VALIDATION_ERROR',
          details: error.issues
        },
        { status: 400 }
      );
    }
    
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
        error: '标记里程碑失败，请稍后重试',
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
}