// Prometheus指标端点
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 简单的指标收集器
class MetricsCollector {
  private static metrics: Record<string, number> = {};

  static increment(name: string, value = 1) {
    this.metrics[name] = (this.metrics[name] || 0) + value;
  }

  static set(name: string, value: number) {
    this.metrics[name] = value;
  }

  static get(name: string): number {
    return this.metrics[name] || 0;
  }

  static getAll(): Record<string, number> {
    return { ...this.metrics };
  }
}

export async function GET() {
  try {
    const startTime = Date.now();
    
    // 收集数据库指标
    const [userCount, babyCount, feedingRecordCount, sleepRecordCount] = await Promise.all([
      prisma.user.count(),
      prisma.baby.count(),
      prisma.feedingRecord.count(),
      prisma.sleepRecord.count(),
    ]);

    const dbLatency = Date.now() - startTime;

    // 设置指标
    MetricsCollector.set('baby_growth_users_total', userCount);
    MetricsCollector.set('baby_growth_babies_total', babyCount);
    MetricsCollector.set('baby_growth_feeding_records_total', feedingRecordCount);
    MetricsCollector.set('baby_growth_sleep_records_total', sleepRecordCount);
    MetricsCollector.set('baby_growth_db_query_duration_ms', dbLatency);

    // 系统指标
    const memUsage = process.memoryUsage();
    MetricsCollector.set('baby_growth_memory_used_bytes', memUsage.heapUsed);
    MetricsCollector.set('baby_growth_memory_total_bytes', memUsage.heapTotal);
    MetricsCollector.set('baby_growth_uptime_seconds', process.uptime());

    // 生成Prometheus格式的指标
    const metrics = MetricsCollector.getAll();
    let output = '';

    for (const [name, value] of Object.entries(metrics)) {
      output += `# HELP ${name} ${getMetricHelp(name)}\n`;
      output += `# TYPE ${name} ${getMetricType(name)}\n`;
      output += `${name} ${value}\n\n`;
    }

    return new NextResponse(output, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });

  } catch (error) {
    console.error('Metrics collection failed:', error);
    return NextResponse.json(
      { error: 'Metrics collection failed' },
      { status: 500 }
    );
  }
}

function getMetricHelp(name: string): string {
  const helpTexts: Record<string, string> = {
    baby_growth_users_total: 'Total number of registered users',
    baby_growth_babies_total: 'Total number of baby profiles',
    baby_growth_feeding_records_total: 'Total number of feeding records',
    baby_growth_sleep_records_total: 'Total number of sleep records',
    baby_growth_db_query_duration_ms: 'Database query duration in milliseconds',
    baby_growth_memory_used_bytes: 'Memory used by the application in bytes',
    baby_growth_memory_total_bytes: 'Total memory allocated by the application in bytes',
    baby_growth_uptime_seconds: 'Application uptime in seconds',
  };
  return helpTexts[name] || 'No description available';
}

function getMetricType(name: string): string {
  if (name.includes('_total')) return 'counter';
  if (name.includes('_duration_')) return 'histogram';
  return 'gauge';
}