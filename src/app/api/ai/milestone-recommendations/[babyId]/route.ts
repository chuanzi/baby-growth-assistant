import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { AIContentGenerator } from '@/lib/ai';
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
          where: {
            achievedAt: { not: null }
          },
          orderBy: { achievedAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!baby) {
      return NextResponse.json(
        { error: '找不到宝宝档案' },
        { status: 404 }
      );
    }

    // 计算宝宝的矫正月龄
    const ageInfo = calculateAge(baby);
    const correctedAgeInDays = ageInfo.correctedAgeInDays;

    // 获取当前阶段和下一阶段的里程碑
    const inProgressMilestones = await prisma.milestone.findMany({
      where: {
        AND: [
          { ageRangeMin: { lte: correctedAgeInDays } },
          { ageRangeMax: { gte: correctedAgeInDays } }
        ]
      },
      include: {
        babyMilestones: {
          where: { babyId: babyId }
        }
      }
    });

    const upcomingMilestones = await prisma.milestone.findMany({
      where: {
        AND: [
          { ageRangeMin: { gt: correctedAgeInDays } },
          { ageRangeMin: { lte: correctedAgeInDays + 60 } } // 未来2个月内的里程碑
        ]
      },
      include: {
        babyMilestones: {
          where: { babyId: babyId }
        }
      },
      orderBy: { ageRangeMin: 'asc' },
      take: 5
    });

    // 筛选未完成的里程碑
    const uncompletedInProgress = inProgressMilestones.filter(m => 
      !m.babyMilestones.some(bm => bm.achievedAt)
    );
    const uncompletedUpcoming = upcomingMilestones.filter(m => 
      !m.babyMilestones.some(bm => bm.achievedAt)
    );

    // 使用AI生成个性化推荐
    const aiGenerator = new AIContentGenerator();
    const recommendation = await aiGenerator.generateMilestoneRecommendation(
      baby,
      baby.milestoneRecords.map(mr => ({
        ...mr,
        achievedAt: mr.achievedAt || undefined
      }))
    );

    // 分析宝宝的发展模式
    const completedMilestones = baby.milestoneRecords.filter(mr => mr.achievedAt);
    const categoryProgress = {
      motor: completedMilestones.filter(mr => mr.milestone.category === 'motor').length,
      cognitive: completedMilestones.filter(mr => mr.milestone.category === 'cognitive').length,
      social: completedMilestones.filter(mr => mr.milestone.category === 'social').length,
      language: completedMilestones.filter(mr => mr.milestone.category === 'language').length,
    };

    // 确定优势和需要关注的领域
    const categories = Object.entries(categoryProgress);
    const strongestCategory = categories.reduce((a, b) => a[1] > b[1] ? a : b)[0];
    const weakestCategory = categories.reduce((a, b) => a[1] < b[1] ? a : b)[0];

    // 生成具体的建议活动
    const suggestions = generateActivitySuggestions(uncompletedInProgress, uncompletedUpcoming, strongestCategory, weakestCategory);

    return NextResponse.json({
      success: true,
      data: {
        baby: {
          id: baby.id,
          name: baby.name,
          correctedAge: ageInfo.correctedAge,
          correctedAgeInDays: correctedAgeInDays,
        },
        aiRecommendation: recommendation,
        priorityMilestones: {
          inProgress: uncompletedInProgress.slice(0, 3),
          upcoming: uncompletedUpcoming.slice(0, 3),
        },
        developmentAnalysis: {
          categoryProgress,
          strongestCategory,
          weakestCategory,
          totalCompleted: completedMilestones.length,
        },
        activitySuggestions: suggestions,
        recentProgress: {
          completedMilestones: completedMilestones.slice(0, 3),
          recentFeeding: baby.feedingRecords.slice(0, 3),
          recentSleep: baby.sleepRecords.slice(0, 3),
        }
      }
    });

  } catch (error) {
    console.error('Get milestone recommendations error:', error);
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: '获取推荐失败，请稍后重试' },
      { status: 500 }
    );
  }
}

// 生成活动建议的辅助函数
function generateActivitySuggestions(
  inProgress: Array<{ id: string; title: string; description: string; category: string }>, 
  upcoming: Array<{ id: string; title: string; description: string; category: string }>, 
  strongest: string, 
  weakest: string
) {
  const suggestions = [];

  // 基于当前进行中的里程碑生成建议
  if (inProgress.length > 0) {
    const priorityMilestone = inProgress[0];
    suggestions.push({
      type: 'focus',
      title: `重点关注：${priorityMilestone.title}`,
      description: priorityMilestone.description,
      category: priorityMilestone.category,
      activities: getActivitiesForMilestone(priorityMilestone),
    });
  }

  // 基于即将到来的里程碑生成准备建议
  if (upcoming.length > 0) {
    const nextMilestone = upcoming[0];
    suggestions.push({
      type: 'prepare',
      title: `提前准备：${nextMilestone.title}`,
      description: `为即将到来的发展阶段做准备`,
      category: nextMilestone.category,
      activities: getPreparationActivities(nextMilestone),
    });
  }

  // 基于薄弱领域生成加强建议
  if (weakest) {
    suggestions.push({
      type: 'strengthen',
      title: `加强练习：${getCategoryName(weakest)}`,
      description: `通过有趣的活动促进${getCategoryName(weakest)}发展`,
      category: weakest,
      activities: getStrengtheningActivities(weakest),
    });
  }

  return suggestions;
}

function getActivitiesForMilestone(milestone: { id: string; title: string; description: string; category: string }) {
  const activities = {
    motor: [
      '🤸‍♀️ 俯卧时间：每天多次短时间俯卧练习',
      '🏃‍♂️ 鼓励翻身：在宝宝侧边放置玩具吸引注意',
      '🤲 抓握练习：提供不同材质的安全玩具',
    ],
    cognitive: [
      '🔍 视觉追踪：慢慢移动鲜艳玩具让宝宝跟着看',
      '🧠 感官探索：提供不同材质和声音的玩具',
      '📚 简单游戏：躲猫猫和拍手游戏',
    ],
    social: [
      '😊 面对面交流：多与宝宝进行眼神接触和微笑',
      '🗣️ 对话时间：回应宝宝的声音和表情',
      '👨‍👩‍👧‍👦 家庭互动：让更多家庭成员参与互动',
    ],
    language: [
      '🎵 唱歌聊天：经常对宝宝唱歌和说话',
      '📖 阅读时间：给宝宝读简单的图画书',
      '🔊 声音模仿：重复宝宝发出的声音',
    ],
  };
  
  return activities[milestone.category as keyof typeof activities] || [];
}

function getPreparationActivities(milestone: { id: string; title: string; description: string; category: string }) {
  // 返回为即将到来的里程碑做准备的活动
  return getActivitiesForMilestone(milestone).map(activity => 
    activity.replace('练习', '准备练习').replace('鼓励', '开始尝试')
  );
}

function getStrengtheningActivities(category: string) {
  const activities = {
    motor: [
      '🏃‍♂️ 增加活动时间：适当延长活动和游戏时间',
      '🤸‍♀️ 多样化动作：尝试不同的身体位置和动作',
      '🎯 目标导向：设置小目标鼓励宝宝移动',
    ],
    cognitive: [
      '🧩 丰富环境：经常更换周围的玩具和刺激',
      '🔬 探索机会：让宝宝安全地探索不同物品',
      '🎮 互动游戏：增加需要思考的简单游戏',
    ],
    social: [
      '👶 社交时间：增加与其他人的互动机会',
      '😄 情感表达：更多地回应宝宝的情感表达',
      '🤗 亲密接触：增加拥抱和身体接触',
    ],
    language: [
      '🗣️ 语言环境：创造更丰富的语言环境',
      '📚 故事时间：增加阅读和讲故事的时间',
      '🎤 鼓励发声：积极回应宝宝的发声尝试',
    ],
  };
  
  return activities[category as keyof typeof activities] || [];
}

function getCategoryName(category: string) {
  const names = {
    motor: '大动作发育',
    cognitive: '认知发育',
    social: '社交情感',
    language: '语言发育',
  };
  
  return names[category as keyof typeof names] || category;
}