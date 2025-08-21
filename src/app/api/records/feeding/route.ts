/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { feedingRecordSchema } from '@/lib/validations';
import { z } from 'zod';
import { getLocalDateRange, getTodayDateString } from '@/utils/time-helpers';

export async function POST(request: NextRequest) {
  try {
    // 验证用户身份
    const session = await requireAuth();
    
    const body = await request.json();
    const validatedData = feedingRecordSchema.parse(body);

    // 验证宝宝归属
    const baby = await prisma.baby.findFirst({
      where: {
        id: body.babyId,
        userId: session.userId as string,
      },
    });

    if (!baby) {
      return NextResponse.json(
        { error: '找不到宝宝档案' },
        { status: 404 }
      );
    }

    // 创建喂养记录
    const feedingRecord = await prisma.feedingRecord.create({
      data: {
        babyId: body.babyId,
        type: validatedData.type,
        amountOrDuration: validatedData.amountOrDuration,
        timestamp: validatedData.timestamp ? new Date(validatedData.timestamp) : new Date(),
        notes: validatedData.notes || null,
      },
    });

    return NextResponse.json({
      success: true,
      message: '喂养记录创建成功',
      record: {
        id: feedingRecord.id,
        type: feedingRecord.type,
        amountOrDuration: feedingRecord.amountOrDuration,
        timestamp: feedingRecord.timestamp.toISOString(),
        notes: feedingRecord.notes,
      },
    });

  } catch (error) {
    console.error('Create feeding record error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || '参数验证失败' },
        { status: 400 }
      );
    }
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: '创建记录失败，请稍后重试' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // 验证用户身份
    const session = await requireAuth();
    
    const { searchParams } = new URL(request.url);
    const babyId = searchParams.get('babyId');
    const date = searchParams.get('date'); // YYYY-MM-DD格式
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!babyId) {
      return NextResponse.json(
        { error: '缺少宝宝ID参数' },
        { status: 400 }
      );
    }

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

    // 构建查询条件
    const whereCondition: {
      babyId: string;
      timestamp?: {
        gte: Date;
        lte: Date;
      };
    } = {
      babyId: babyId,
    };

    // 如果指定了日期，只查询该日期的记录
    if (date) {
      const { start, end } = getLocalDateRange(date);
      whereCondition.timestamp = {
        gte: start,
        lte: end,
      };
    }

    // 查询喂养记录
    const feedingRecords = await prisma.feedingRecord.findMany({
      where: whereCondition,
      orderBy: { timestamp: 'desc' },
      take: limit,
    });

    // 如果查询今日记录，同时返回统计信息
    let statistics = null;
    if (date || !date) { // 默认返回今日统计
      const today = date || getTodayDateString(); // 如果没有指定日期，使用当前本地日期
      const { start: startOfToday, end: endOfToday } = getLocalDateRange(today);

      const todayRecords = await prisma.feedingRecord.findMany({
        where: {
          babyId: babyId,
          timestamp: {
            gte: startOfToday,
            lte: endOfToday,
          },
        },
      });

      statistics = {
        totalFeedings: todayRecords.length,
        breastFeedings: todayRecords.filter((r: any) => r.type === 'breast').length,
        formulaFeedings: todayRecords.filter((r: any) => r.type === 'formula').length,
        solidFeedings: todayRecords.filter((r: any) => r.type === 'solid').length,
        lastFeedingTime: todayRecords.length > 0 
          ? todayRecords.sort((a: any, b: any) => b.timestamp.getTime() - a.timestamp.getTime())[0].timestamp.toISOString()
          : null,
      };
    }

    return NextResponse.json({
      success: true,
      records: feedingRecords.map((record: any) => ({
        id: record.id,
        type: record.type,
        amountOrDuration: record.amountOrDuration,
        timestamp: record.timestamp.toISOString(),
        notes: record.notes,
      })),
      statistics,
      baby: {
        id: baby.id,
        name: baby.name,
      },
    });

  } catch (error) {
    console.error('Get feeding records error:', error);
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: '获取记录失败，请稍后重试' },
      { status: 500 }
    );
  }
}