import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ babyId: string }> }
) {
  try {
    // 验证用户身份
    const session = await requireAuth();
    const { babyId } = await params;
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100); // 最大100条
    const date = searchParams.get('date'); // YYYY-MM-DD 格式，指定日期
    const type = searchParams.get('type'); // feeding, sleep, milestone 或 all
    
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

    // 构建时间过滤条件
    let timeFilter = {};
    if (date) {
      const targetDate = new Date(date);
      const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
      const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate() + 1);
      
      timeFilter = {
        timestamp: {
          gte: startOfDay,
          lt: endOfDay,
        }
      };
    }

    const offset = (page - 1) * limit;
    interface TimelineItem {
      id: string;
      type: 'feeding' | 'sleep' | 'milestone';
      subtype: string;
      timestamp: string;
      title: string;
      description: string;
      details: Record<string, string | number | boolean | null | undefined>;
      icon: string;
      priority: 'low' | 'normal' | 'high';
    }

    const timelineItems: TimelineItem[] = [];

    // 并行查询所有类型的记录
    const promises = [];

    if (!type || type === 'all' || type === 'feeding') {
      promises.push(
        prisma.feedingRecord.findMany({
          where: {
            babyId: babyId,
            ...timeFilter,
          },
          orderBy: { timestamp: 'desc' },
          ...(type === 'feeding' ? { skip: offset, take: limit } : {})
        }).then(records => records.map((record: { id: string; type: string; amountOrDuration: string; timestamp: Date; notes?: string }) => ({
          id: record.id,
          type: 'feeding',
          subtype: record.type,
          timestamp: record.timestamp.toISOString(),
          title: getFeedingTitle(record.type, record.amountOrDuration),
          description: record.notes || `${record.type === 'breast' ? '母乳喂养' : record.type === 'formula' ? '配方奶喂养' : '辅食'}`,
          details: {
            feedingType: record.type,
            amountOrDuration: record.amountOrDuration,
            notes: record.notes,
          },
          icon: getFeedingIcon(record.type),
          priority: 'normal' as const,
        })))
      );
    } else {
      promises.push(Promise.resolve([]));
    }

    if (!type || type === 'all' || type === 'sleep') {
      promises.push(
        prisma.sleepRecord.findMany({
          where: {
            babyId: babyId,
            ...timeFilter,
          },
          orderBy: { timestamp: 'desc' },
          ...(type === 'sleep' ? { skip: offset, take: limit } : {})
        }).then(records => records.map((record: { id: string; startTime: Date; endTime: Date; durationMinutes: number; timestamp: Date; notes?: string }) => ({
          id: record.id,
          type: 'sleep',
          subtype: 'sleep',
          timestamp: record.timestamp.toISOString(),
          title: `睡眠 ${Math.floor(record.durationMinutes / 60)}小时${record.durationMinutes % 60}分钟`,
          description: `${formatTime(record.startTime)} - ${formatTime(record.endTime)}`,
          details: {
            startTime: record.startTime.toISOString(),
            endTime: record.endTime.toISOString(),
            durationMinutes: record.durationMinutes,
            notes: record.notes,
          },
          icon: 'sleep',
          priority: 'normal' as const,
        })))
      );
    } else {
      promises.push(Promise.resolve([]));
    }

    if (!type || type === 'all' || type === 'milestone') {
      const milestoneFilter = date ? {
        achievedAt: {
          gte: new Date(date),
          lt: new Date(new Date(date).getTime() + 24 * 60 * 60 * 1000),
        }
      } : {};

      promises.push(
        prisma.babyMilestone.findMany({
          where: {
            babyId: babyId,
            achievedAt: { not: null },
            ...milestoneFilter,
          },
          include: {
            milestone: true
          },
          orderBy: { achievedAt: 'desc' },
          ...(type === 'milestone' ? { skip: offset, take: limit } : {})
        }).then(records => records.map((record: { id: string; milestoneId: string; achievedAt: Date | null; correctedAgeAtAchievement?: number | null; milestone: { title: string; description: string; category: string; ageRangeMin: number; ageRangeMax: number } }) => ({
          id: record.id,
          type: 'milestone',
          subtype: record.milestone.category,
          timestamp: record.achievedAt?.toISOString(),
          title: `完成里程碑: ${record.milestone.title}`,
          description: record.milestone.description,
          details: {
            milestoneId: record.milestoneId,
            category: record.milestone.category,
            correctedAgeAtAchievement: record.correctedAgeAtAchievement,
            ageRangeMin: record.milestone.ageRangeMin,
            ageRangeMax: record.milestone.ageRangeMax,
          },
          icon: getMilestoneIcon(record.milestone.category),
          priority: 'high' as const,
        })))
      );
    } else {
      promises.push(Promise.resolve([]));
    }

    const [feedingItems, sleepItems, milestoneItems] = await Promise.all(promises);

    // 合并所有记录
    if (type === 'all') {
      timelineItems.push(...feedingItems, ...sleepItems, ...milestoneItems);
      
      // 按时间排序
      timelineItems.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      // 应用分页
      const paginatedItems = timelineItems.slice(offset, offset + limit);
      const total = timelineItems.length;

      return NextResponse.json({
        success: true,
        data: {
          baby: {
            id: baby.id,
            name: baby.name,
          },
          timeline: paginatedItems,
          pagination: {
            page: page,
            limit: limit,
            total: total,
            totalPages: Math.ceil(total / limit),
            hasNext: page * limit < total,
            hasPrev: page > 1,
          },
          filters: {
            date: date,
            type: type || 'all',
          },
          summary: {
            totalItems: total,
            feedingCount: feedingItems.length,
            sleepCount: sleepItems.length,
            milestoneCount: milestoneItems.length,
          }
        }
      });
    } else {
      // 单一类型查询，直接返回对应的记录
      const items = type === 'feeding' ? feedingItems : 
                   type === 'sleep' ? sleepItems : milestoneItems;
      
      // 获取总数（为分页需要）
      let totalCount = 0;
      if (type === 'feeding') {
        totalCount = await prisma.feedingRecord.count({
          where: { babyId: babyId, ...timeFilter }
        });
      } else if (type === 'sleep') {
        totalCount = await prisma.sleepRecord.count({
          where: { babyId: babyId, ...timeFilter }
        });
      } else if (type === 'milestone') {
        const milestoneFilter = date ? {
          achievedAt: {
            gte: new Date(date),
            lt: new Date(new Date(date).getTime() + 24 * 60 * 60 * 1000),
          }
        } : { achievedAt: { not: null } };
        
        totalCount = await prisma.babyMilestone.count({
          where: { babyId: babyId, ...milestoneFilter }
        });
      }

      return NextResponse.json({
        success: true,
        data: {
          baby: {
            id: baby.id,
            name: baby.name,
          },
          timeline: items,
          pagination: {
            page: page,
            limit: limit,
            total: totalCount,
            totalPages: Math.ceil(totalCount / limit),
            hasNext: page * limit < totalCount,
            hasPrev: page > 1,
          },
          filters: {
            date: date,
            type: type,
          },
          summary: {
            totalItems: totalCount,
            feedingCount: type === 'feeding' ? totalCount : 0,
            sleepCount: type === 'sleep' ? totalCount : 0,
            milestoneCount: type === 'milestone' ? totalCount : 0,
          }
        }
      });
    }

  } catch (error) {
    console.error('Get timeline error:', error);
    
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
        error: '获取时间线失败，请稍后重试',
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
}

// 辅助函数：格式化喂养标题
function getFeedingTitle(type: string, amountOrDuration: string): string {
  const value = amountOrDuration || '';
  switch (type) {
    case 'breast':
      return `母乳喂养 ${value}分钟`;
    case 'formula':
      return `配方奶 ${value}ml`;
    case 'solid':
      return `辅食 ${value}`;
    default:
      return `喂养 ${value}`;
  }
}

// 辅助函数：获取喂养图标
function getFeedingIcon(type: string): string {
  switch (type) {
    case 'breast':
      return 'breast';
    case 'formula':
      return 'bottle';
    case 'solid':
      return 'food';
    default:
      return 'feeding';
  }
}

// 辅助函数：获取里程碑图标
function getMilestoneIcon(category: string): string {
  switch (category) {
    case 'motor':
      return 'activity';
    case 'cognitive':
      return 'brain';
    case 'social':
      return 'people';
    case 'language':
      return 'chat';
    default:
      return 'milestone';
  }
}

// 辅助函数：格式化时间
function formatTime(date: Date): string {
  return date.toLocaleTimeString('zh-CN', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false 
  });
}