// 数据库专用健康检查端点
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const startTime = Date.now();
    
    // 执行简单查询测试连接
    await prisma.$executeRaw`SELECT 1 as test`;
    
    const latency = Date.now() - startTime;
    
    return NextResponse.json({
      status: 'healthy',
      latency: `${latency}ms`,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Database health check failed:', error);
    
    return NextResponse.json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Database connection failed',
      timestamp: new Date().toISOString()
    }, { status: 503 });
  }
}