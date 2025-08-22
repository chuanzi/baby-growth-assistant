import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { aiContentGenerator } from '@/lib/ai';

export async function GET(_request: NextRequest) {
  try {
    // 验证用户身份
    await requireAuth();
    
    // 获取AI服务使用指标
    const metrics = aiContentGenerator.getUsageMetrics();
    const isEnabled = aiContentGenerator.isServiceEnabled();

    // 计算服务健康状态
    const healthStatus = {
      status: isEnabled ? 'healthy' : 'disabled',
      uptime: Date.now() - metrics.lastResetTime,
      errorRate: metrics.requestCount > 0 ? (metrics.errors / metrics.requestCount) : 0,
      averageTokensPerRequest: metrics.requestCount > 0 ? (metrics.tokensUsed / metrics.requestCount) : 0,
    };

    // 服务状态评级
    let serviceGrade = 'A';
    if (!isEnabled) {
      serviceGrade = 'F';
    } else if (healthStatus.errorRate > 0.2) {
      serviceGrade = 'D';
    } else if (healthStatus.errorRate > 0.1) {
      serviceGrade = 'C';
    } else if (healthStatus.errorRate > 0.05) {
      serviceGrade = 'B';
    }

    return NextResponse.json({
      success: true,
      data: {
        serviceEnabled: isEnabled,
        serviceGrade,
        metrics: {
          ...metrics,
          uptimeHours: Math.round(healthStatus.uptime / (1000 * 60 * 60) * 100) / 100,
          errorRate: Math.round(healthStatus.errorRate * 100 * 100) / 100, // 百分比，保留两位小数
          averageTokensPerRequest: Math.round(healthStatus.averageTokensPerRequest * 100) / 100
        },
        health: {
          status: healthStatus.status,
          lastCheck: new Date().toISOString(),
          recommendations: generateHealthRecommendations(healthStatus, isEnabled)
        }
      }
    });

  } catch (error) {
    console.error('Get AI metrics error:', error);
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: '获取AI服务指标失败' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // 验证用户身份（可能需要管理员权限）
    await requireAuth();
    
    const { action } = await request.json();
    
    if (action === 'reset') {
      // 重置使用指标
      aiContentGenerator.resetUsageMetrics();
      
      return NextResponse.json({
        success: true,
        message: 'AI服务指标已重置',
        data: {
          resetAt: new Date().toISOString()
        }
      });
    }

    return NextResponse.json(
      { error: '不支持的操作' },
      { status: 400 }
    );

  } catch (error) {
    console.error('AI metrics action error:', error);
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: '执行AI服务操作失败' },
      { status: 500 }
    );
  }
}

function generateHealthRecommendations(
  health: { errorRate: number; averageTokensPerRequest: number }, 
  isEnabled: boolean
): string[] {
  const recommendations: string[] = [];
  
  if (!isEnabled) {
    recommendations.push('AI服务未启用，请检查GEMINI_API_KEY环境变量');
    recommendations.push('联系技术支持获取API密钥配置指导');
  } else {
    if (health.errorRate > 0.1) {
      recommendations.push('错误率较高，建议检查网络连接和API密钥有效性');
    }
    
    if (health.averageTokensPerRequest > 800) {
      recommendations.push('平均token使用量较高，可考虑优化提示词长度');
    }
    
    if (health.errorRate < 0.05) {
      recommendations.push('服务运行良好，可继续正常使用');
    }
    
    recommendations.push('建议定期监控服务状态，确保最佳用户体验');
  }
  
  return recommendations;
}