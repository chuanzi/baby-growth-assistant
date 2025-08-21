import { NextResponse } from 'next/server';

export async function GET() {
  const now = new Date();
  
  return NextResponse.json({
    serverTime: {
      iso: now.toISOString(),
      local: now.toLocaleString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      utcOffset: now.getTimezoneOffset(),
    },
    formats: {
      dateTimeLocal: now.toISOString().slice(0, 16), // 用于 datetime-local input
      dateOnly: now.toISOString().split('T')[0],     // 用于 date input
      timeOnly: now.toTimeString().slice(0, 5),      // 用于 time input
    },
    chinese: {
      beijing: new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }),
      current: new Date().toLocaleString('zh-CN'),
    }
  });
}