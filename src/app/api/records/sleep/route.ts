import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { sleepRecordSchema } from '@/lib/validations';
import { z } from 'zod';
import { getLocalDateRange, getTodayDateString } from '@/utils/time-helpers';

export async function POST(request: NextRequest) {
  try {
    // 验证用户身份
    const session = await requireAuth();
    
    const body = await request.json();
    const validatedData = sleepRecordSchema.parse(body);

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

    // 计算睡眠时长（分钟）
    const startTime = new Date(validatedData.startTime);
    const endTime = new Date(validatedData.endTime);
    const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));

    // 创建睡眠记录
    const sleepRecord = await prisma.sleepRecord.create({
      data: {
        babyId: validatedData.babyId,
        startTime: startTime,
        endTime: endTime,
        durationMinutes: durationMinutes,
        timestamp: validatedData.timestamp ? new Date(validatedData.timestamp) : new Date(),
        notes: validatedData.notes || null,
      },
    });

    return NextResponse.json({
      success: true,
      message: '睡眠记录创建成功',
      record: {
        id: sleepRecord.id,
        startTime: sleepRecord.startTime.toISOString(),
        endTime: sleepRecord.endTime.toISOString(),
        durationMinutes: sleepRecord.durationMinutes,
        timestamp: sleepRecord.timestamp.toISOString(),
        notes: sleepRecord.notes,
      },
    });

  } catch (error) {
    console.error('Create sleep record error:', error);
    
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

    // 查询睡眠记录
    const sleepRecords = await prisma.sleepRecord.findMany({
      where: whereCondition,
      orderBy: { timestamp: 'desc' },
      take: limit,
    });

    // 如果查询今日记录，同时返回统计信息
    let statistics = null;
    if (date || !date) { // 默认返回今日统计
      const today = date || getTodayDateString(); // 如果没有指定日期，使用当前本地日期
      const { start: startOfToday, end: endOfToday } = getLocalDateRange(today);

      const todayRecords = await prisma.sleepRecord.findMany({
        where: {
          babyId: babyId,
          timestamp: {
            gte: startOfToday,
            lte: endOfToday,
          },
        },
      });

      const totalSleepMinutes = todayRecords.reduce((sum, record) => sum + record.durationMinutes, 0);
      const totalSleepHours = Math.round((totalSleepMinutes / 60) * 10) / 10;

      statistics = {
        totalSleepSessions: todayRecords.length,
        totalSleepMinutes: totalSleepMinutes,
        totalSleepHours: totalSleepHours,
        averageSleepDuration: todayRecords.length > 0 
          ? Math.round((totalSleepMinutes / todayRecords.length) * 10) / 10
          : 0,
        lastSleepTime: todayRecords.length > 0 
          ? todayRecords.sort((a, b) => b.endTime.getTime() - a.endTime.getTime())[0].endTime.toISOString()
          : null,
      };
    }

    return NextResponse.json({
      success: true,
      records: sleepRecords.map(record => ({
        id: record.id,
        startTime: record.startTime.toISOString(),
        endTime: record.endTime.toISOString(),
        durationMinutes: record.durationMinutes,
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
    console.error('Get sleep records error:', error);
    
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