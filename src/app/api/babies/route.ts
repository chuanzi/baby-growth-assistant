import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { babyProfileSchema } from '@/lib/validations';

export async function POST(request: NextRequest) {
  try {
    // 验证用户身份
    const session = await requireAuth();
    
    const body = await request.json();
    const validatedData = babyProfileSchema.parse(body);

    // 创建宝宝档案
    const baby = await prisma.baby.create({
      data: {
        userId: session.userId as string,
        name: validatedData.name,
        birthDate: new Date(validatedData.birthDate),
        gestationalWeeks: validatedData.gestationalWeeks,
        gestationalDays: validatedData.gestationalDays,
      },
    });

    return NextResponse.json({
      success: true,
      message: '宝宝档案创建成功',
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
    console.error('Create baby profile error:', error);
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: '创建档案失败，请稍后重试' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // 验证用户身份
    const session = await requireAuth();
    
    // 获取用户的所有宝宝档案
    const babies = await prisma.baby.findMany({
      where: {
        userId: session.userId as string,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      babies: babies.map(baby => ({
        id: baby.id,
        name: baby.name,
        birthDate: baby.birthDate.toISOString(),
        gestationalWeeks: baby.gestationalWeeks,
        gestationalDays: baby.gestationalDays,
        createdAt: baby.createdAt.toISOString(),
        updatedAt: baby.updatedAt.toISOString(),
      })),
    });

  } catch (error) {
    console.error('Get babies error:', error);
    
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