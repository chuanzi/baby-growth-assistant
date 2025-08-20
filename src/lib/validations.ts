import { z } from 'zod';

// 手机号验证正则
const phoneRegex = /^1[3-9]\d{9}$/;

// 登录表单验证
export const loginSchema = z.object({
  phone: z
    .string()
    .min(1, '请输入手机号')
    .regex(phoneRegex, '请输入正确的手机号格式'),
  verificationCode: z
    .string()
    .min(4, '验证码不能少于4位')
    .max(6, '验证码不能超过6位')
    .regex(/^\d+$/, '验证码只能包含数字'),
});

// 注册表单验证
export const registerSchema = z.object({
  phone: z
    .string()
    .min(1, '请输入手机号')
    .regex(phoneRegex, '请输入正确的手机号格式'),
  verificationCode: z
    .string()
    .min(4, '验证码不能少于4位')
    .max(6, '验证码不能超过6位')
    .regex(/^\d+$/, '验证码只能包含数字'),
});

// 宝宝档案验证
export const babyProfileSchema = z.object({
  name: z
    .string()
    .min(1, '请输入宝宝昵称')
    .max(20, '昵称不能超过20个字符'),
  birthDate: z
    .string()
    .min(1, '请选择出生日期')
    .refine((date) => {
      const birthDate = new Date(date);
      const now = new Date();
      return birthDate <= now;
    }, '出生日期不能晚于今天'),
  gestationalWeeks: z
    .number()
    .min(20, '孕周不能少于20周')
    .max(44, '孕周不能超过44周'),
  gestationalDays: z
    .number()
    .min(0, '天数不能少于0')
    .max(6, '天数不能超过6'),
});

// 喂养记录验证
export const feedingRecordSchema = z.object({
  type: z.enum(['breast', 'formula', 'solid'], {
    required_error: '请选择喂养类型',
  }),
  amountOrDuration: z
    .string()
    .min(1, '请输入奶量或时长'),
  timestamp: z.string().optional(),
  notes: z.string().optional(),
});

// 睡眠记录验证
export const sleepRecordSchema = z.object({
  startTime: z.string().min(1, '请选择开始时间'),
  endTime: z.string().min(1, '请选择结束时间'),
  timestamp: z.string().optional(),
}).refine((data) => {
  const start = new Date(data.startTime);
  const end = new Date(data.endTime);
  return end > start;
}, {
  message: '结束时间必须晚于开始时间',
  path: ['endTime'],
});

// 类型导出
export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type BabyProfileFormData = z.infer<typeof babyProfileSchema>;
export type FeedingRecordFormData = z.infer<typeof feedingRecordSchema>;
export type SleepRecordFormData = z.infer<typeof sleepRecordSchema>;