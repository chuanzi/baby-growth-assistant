import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { aiContentGenerator } from '@/lib/ai';
import { rateLimiter, createRateLimitResponse } from '@/lib/rate-limiter';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ babyId: string }> }
) {
  try {
    // 验证用户身份
    const session = await requireAuth();
    const userId = session.userId as string;
    
    // 检查请求频率限制
    const rateLimitCheck = rateLimiter.checkAIKnowledgeCards(userId);
    if (!rateLimitCheck.allowed) {
      return createRateLimitResponse(rateLimitCheck);
    }
    
    const { babyId } = await params;
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? Math.min(parseInt(limitParam, 10), 10) : 5; // 最多10个，默认5个
    
    // 获取宝宝信息，确保属于当前用户
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

    // 生成知识卡片推荐
    const knowledgeCards = await aiContentGenerator.generateKnowledgeCards(
      baby,
      limit
    );

    // 根据相关性分数排序
    const sortedCards = knowledgeCards
      .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0))
      .map((card, index) => ({
        id: `card-${babyId}-${index}`,
        ...card,
        createdAt: new Date().toISOString()
      }));

    return NextResponse.json({
      success: true,
      data: {
        baby: {
          id: baby.id,
          name: baby.name
        },
        knowledgeCards: sortedCards,
        totalCards: sortedCards.length,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Generate knowledge cards error:', error);
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: '生成知识卡片失败，请稍后重试' },
      { status: 500 }
    );
  }
}