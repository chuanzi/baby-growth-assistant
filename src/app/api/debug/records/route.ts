import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const babyId = searchParams.get('babyId');
    
    if (!babyId) {
      return NextResponse.json({ error: 'Missing babyId' }, { status: 400 });
    }

    // 获取所有记录用于调试
    const [feedingRecords, sleepRecords, baby] = await Promise.all([
      prisma.feedingRecord.findMany({
        where: { babyId },
        orderBy: { timestamp: 'desc' },
        take: 10,
      }),
      prisma.sleepRecord.findMany({
        where: { babyId },
        orderBy: { timestamp: 'desc' },
        take: 10,
      }),
      prisma.baby.findUnique({
        where: { id: babyId },
        select: { id: true, name: true }
      })
    ]);

    const today = new Date().toISOString().split('T')[0];
    const startOfToday = new Date(`${today}T00:00:00.000Z`);
    const endOfToday = new Date(`${today}T23:59:59.999Z`);

    const todayFeeding = await prisma.feedingRecord.findMany({
      where: {
        babyId,
        timestamp: {
          gte: startOfToday,
          lte: endOfToday,
        },
      },
    });

    const todaySleep = await prisma.sleepRecord.findMany({
      where: {
        babyId,
        timestamp: {
          gte: startOfToday,
          lte: endOfToday,
        },
      },
    });

    return NextResponse.json({
      success: true,
      baby,
      debug: {
        today,
        startOfToday: startOfToday.toISOString(),
        endOfToday: endOfToday.toISOString(),
        currentTime: new Date().toISOString(),
      },
      allRecords: {
        feeding: feedingRecords.map((r: typeof feedingRecords[0]) => ({
          id: r.id,
          type: r.type,
          amount: r.amountOrDuration,
          timestamp: r.timestamp.toISOString(),
        })),
        sleep: sleepRecords.map((r: typeof sleepRecords[0]) => ({
          id: r.id,
          startTime: r.startTime.toISOString(),
          endTime: r.endTime.toISOString(),
          duration: r.durationMinutes,
          timestamp: r.timestamp.toISOString(),
        })),
      },
      todayRecords: {
        feeding: todayFeeding.map((r: typeof todayFeeding[0]) => ({
          id: r.id,
          type: r.type,
          amount: r.amountOrDuration,
          timestamp: r.timestamp.toISOString(),
        })),
        sleep: todaySleep.map((r: typeof todaySleep[0]) => ({
          id: r.id,
          startTime: r.startTime.toISOString(),
          endTime: r.endTime.toISOString(),
          duration: r.durationMinutes,
          timestamp: r.timestamp.toISOString(),
        })),
      },
      statistics: {
        totalFeedingRecords: feedingRecords.length,
        totalSleepRecords: sleepRecords.length,
        todayFeedingCount: todayFeeding.length,
        todaySleepCount: todaySleep.length,
        todaySleepHours: todaySleep.reduce((sum: number, r: typeof todaySleep[0]) => sum + r.durationMinutes, 0) / 60,
      }
    });

  } catch (error) {
    console.error('Debug API error:', error);
    return NextResponse.json(
      { error: 'Debug failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}