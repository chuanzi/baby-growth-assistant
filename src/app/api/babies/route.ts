import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { babyProfileSchema } from '@/lib/validations';

export async function POST(request: NextRequest) {
  try {
    // 验证用户身份
    const session = await requireAuth();
    
    const body = await request.json();
    console.log('Received baby profile data:', body);
    
    // 确保数字类型字段是数字
    const processedBody = {
      ...body,
      gestationalWeeks: typeof body.gestationalWeeks === 'string' ? parseInt(body.gestationalWeeks) : body.gestationalWeeks,
      gestationalDays: typeof body.gestationalDays === 'string' ? parseInt(body.gestationalDays) : body.gestationalDays,
    };
    
    console.log('Processed baby profile data:', processedBody);
    const validatedData = babyProfileSchema.parse(processedBody);

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

    // 更详细的错误信息用于调试
    if (error instanceof Error) {
      console.error('Detailed error:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      
      return NextResponse.json(
        { error: `创建档案失败: ${error.message}` },
        { status: 500 }
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
      babies: babies.map((baby: typeof babies[0]) => ({
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