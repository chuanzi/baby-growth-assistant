/**
 * 时间相关的工具函数
 * 统一处理前端时间显示和后端时间存储
 */

/**
 * 获取当前本地时间的 datetime-local 格式字符串
 * 格式：YYYY-MM-DDTHH:mm
 */
export function getCurrentLocalDateTime(): string {
  const now = new Date();
  // 获取本地时间偏移量并调整
  const offset = now.getTimezoneOffset() * 60000;
  const localTime = new Date(now.getTime() - offset);
  return localTime.toISOString().slice(0, 16);
}

/**
 * 获取指定小时前的本地时间
 */
export function getLocalDateTimeHoursAgo(hoursAgo: number): string {
  const now = new Date();
  now.setHours(now.getHours() - hoursAgo);
  const offset = now.getTimezoneOffset() * 60000;
  const localTime = new Date(now.getTime() - offset);
  return localTime.toISOString().slice(0, 16);
}

/**
 * 获取今天的日期字符串 (YYYY-MM-DD)
 */
export function getTodayDateString(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  const localTime = new Date(now.getTime() - offset);
  return localTime.toISOString().split('T')[0];
}

/**
 * 将 datetime-local 格式转换为 Date 对象
 */
export function parseLocalDateTime(dateTimeString: string): Date {
  // datetime-local 格式是本地时间，直接创建 Date 对象
  return new Date(dateTimeString);
}

/**
 * 格式化时间显示 (HH:mm)
 */
export function formatTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * 格式化日期时间显示
 */
export function formatDateTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * 计算时长（分钟）
 */
export function calculateDurationMinutes(startTime: string | Date, endTime: string | Date): number {
  const start = typeof startTime === 'string' ? new Date(startTime) : startTime;
  const end = typeof endTime === 'string' ? new Date(endTime) : endTime;
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60));
}

/**
 * 格式化时长显示
 */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours > 0) {
    return `${hours}小时${mins}分钟`;
  } else {
    return `${mins}分钟`;
  }
}

/**
 * 获取本地日期的开始和结束时间 (用于数据库查询)
 * 避免时区问题，使用用户本地时间范围
 */
export function getLocalDateRange(dateString?: string): { start: Date; end: Date } {
  const targetDate = dateString || getTodayDateString();
  
  // 创建本地时间的开始和结束
  const start = new Date(`${targetDate}T00:00:00`);
  const end = new Date(`${targetDate}T23:59:59.999`);
  
  return { start, end };
}