// 健康检查API端点
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const startTime = Date.now();
    
    // 数据库连接检查
    await prisma.$queryRaw`SELECT 1`;
    
    const dbLatency = Date.now() - startTime;
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: {
        status: 'connected',
        latency: `${dbLatency}ms`
      },
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version || '1.0.0'
    }, { status: 200 });
    
  } catch (error) {
    console.error('Health check failed:', error);
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Database connection failed'
    }, { status: 503 });
  }
}

// 数据库特定健康检查
export async function POST() {
  try {
    // 更深层的数据库检查
    const userCount = await prisma.user.count();
    const babyCount = await prisma.baby.count();
    
    return NextResponse.json({
      status: 'healthy',
      database: {
        status: 'connected',
        stats: {
          users: userCount,
          babies: babyCount
        }
      }
    });
    
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 503 });
  }
}