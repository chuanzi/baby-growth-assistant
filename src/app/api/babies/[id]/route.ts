import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { babyProfileSchema } from '@/lib/validations';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 验证用户身份
    const session = await requireAuth();
    
    const baby = await prisma.baby.findFirst({
      where: {
        id: params.id,
        userId: session.userId as string,
      },
      include: {
        feedingRecords: {
          take: 10,
          orderBy: { timestamp: 'desc' },
        },
        sleepRecords: {
          take: 10,
          orderBy: { timestamp: 'desc' },
        },
        milestoneRecords: {
          include: {
            milestone: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!baby) {
      return NextResponse.json(
        { error: '找不到宝宝档案' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      baby: {
        id: baby.id,
        name: baby.name,
        birthDate: baby.birthDate.toISOString(),
        gestationalWeeks: baby.gestationalWeeks,
        gestationalDays: baby.gestationalDays,
        createdAt: baby.createdAt.toISOString(),
        updatedAt: baby.updatedAt.toISOString(),
        feedingRecords: baby.feedingRecords,
        sleepRecords: baby.sleepRecords,
        milestoneRecords: baby.milestoneRecords,
      },
    });

  } catch (error) {
    console.error('Get baby error:', error);
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: '获取档案失败，请稍后重试' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 验证用户身份
    const session = await requireAuth();
    
    const body = await request.json();
    const validatedData = babyProfileSchema.parse(body);

    // 检查宝宝是否存在且属于当前用户
    const existingBaby = await prisma.baby.findFirst({
      where: {
        id: params.id,
        userId: session.userId as string,
      },
    });

    if (!existingBaby) {
      return NextResponse.json(
        { error: '找不到宝宝档案' },
        { status: 404 }
      );
    }

    // 更新宝宝档案
    const baby = await prisma.baby.update({
      where: { id: params.id },
      data: {
        name: validatedData.name,
        birthDate: new Date(validatedData.birthDate),
        gestationalWeeks: validatedData.gestationalWeeks,
        gestationalDays: validatedData.gestationalDays,
      },
    });

    return NextResponse.json({
      success: true,
      message: '档案更新成功',
      baby: {
        id: baby.id,
        name: baby.name,
        birthDate: baby.birthDate.toISOString(),
        gestationalWeeks: baby.gestationalWeeks,
        gestationalDays: baby.gestationalDays,
        createdAt: baby.createdAt.toISOString(),
        updatedAt: baby.updatedAt.toISOString(),
      },
    });

  } catch (error) {
    console.error('Update baby error:', error);
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: '更新档案失败，请稍后重试' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 验证用户身份
    const session = await requireAuth();
    
    // 检查宝宝是否存在且属于当前用户
    const existingBaby = await prisma.baby.findFirst({
      where: {
        id: params.id,
        userId: session.userId as string,
      },
    });

    if (!existingBaby) {
      return NextResponse.json(
        { error: '找不到宝宝档案' },
        { status: 404 }
      );
    }

    // 删除宝宝档案（会自动删除相关记录，因为设置了Cascade）
    await prisma.baby.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      success: true,
      message: '档案删除成功',
    });

  } catch (error) {
    console.error('Delete baby error:', error);
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: '删除档案失败，请稍后重试' },
      { status: 500 }
    );
  }
}