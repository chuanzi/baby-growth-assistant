import { differenceInDays, differenceInMonths } from 'date-fns';
import type { Baby, AgeInfo } from '@/types';

export function calculateAge(baby: Baby): AgeInfo {
  const now = new Date();
  const birthDate = new Date(baby.birthDate);
  
  // 计算实际月龄
  const actualMonths = differenceInMonths(now, birthDate);
  const actualDays = differenceInDays(now, birthDate) % 30; // 简化计算，每月按30天算
  
  // 计算早产的天数：40周 - 实际孕周
  const fullTermWeeks = 40;
  const totalGestationalDays = baby.gestationalWeeks * 7 + baby.gestationalDays;
  const fullTermDays = fullTermWeeks * 7;
  const prematureDays = fullTermDays - totalGestationalDays;
  
  // 计算矫正月龄（从出生日期加上早产天数开始计算）
  const correctedBirthDate = new Date(birthDate);
  correctedBirthDate.setDate(correctedBirthDate.getDate() + prematureDays);
  
  const correctedAgeInDays = Math.max(0, differenceInDays(now, correctedBirthDate));
  const correctedMonths = Math.floor(correctedAgeInDays / 30);
  const correctedDays = correctedAgeInDays % 30;
  
  return {
    actualAge: {
      months: actualMonths,
      days: actualDays
    },
    correctedAge: {
      months: correctedMonths,
      days: correctedDays
    },
    correctedAgeInDays
  };
}

export function formatAge(months: number, days: number): string {
  if (months === 0) {
    return `${days}天`;
  } else if (days === 0) {
    return `${months}个月`;
  } else {
    return `${months}个月${days}天`;
  }
}

export function getAgeCategory(correctedAgeInDays: number): string {
  if (correctedAgeInDays < 60) return '0-2个月';
  if (correctedAgeInDays < 120) return '2-4个月';
  if (correctedAgeInDays < 180) return '4-6个月';
  if (correctedAgeInDays < 270) return '6-9个月';
  if (correctedAgeInDays < 365) return '9-12个月';
  return '12个月以上';
}