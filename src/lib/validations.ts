import { z } from 'zod';

// 手机号验证正则
const phoneRegex = /^1[3-9]\d{9}$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// 手机登录表单验证
export const phoneLoginSchema = z.object({
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

// 邮箱登录表单验证
export const emailLoginSchema = z.object({
  email: z
    .string()
    .min(1, '请输入邮箱地址')
    .regex(emailRegex, '请输入正确的邮箱格式')
    .toLowerCase(),
  password: z
    .string()
    .min(8, '密码至少8位字符')
    .max(100, '密码不能超过100位字符')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, '密码需包含大小写字母和数字'),
});

// 手机注册表单验证
export const phoneRegisterSchema = z.object({
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

// 邮箱注册表单验证
export const emailRegisterSchema = z.object({
  email: z
    .string()
    .min(1, '请输入邮箱地址')
    .regex(emailRegex, '请输入正确的邮箱格式')
    .toLowerCase(),
  password: z
    .string()
    .min(8, '密码至少8位字符')
    .max(100, '密码不能超过100位字符')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, '密码需包含大小写字母和数字'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: '密码确认不一致',
  path: ['confirmPassword'],
});

// 兼容性：保持原有的 loginSchema 和 registerSchema
export const loginSchema = phoneLoginSchema;
export const registerSchema = phoneRegisterSchema;

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
  babyId: z.string().min(1, '请选择宝宝'),
  type: z.enum(['breast', 'formula', 'solid'], {
    message: '请选择喂养类型',
  }),
  amountOrDuration: z
    .string()
    .min(1, '请输入奶量或时长'),
  timestamp: z.string().optional(),
  notes: z.string().optional(),
});

// 睡眠记录验证
export const sleepRecordSchema = z.object({
  babyId: z.string().min(1, '请选择宝宝'),
  startTime: z.string().min(1, '请选择开始时间'),
  endTime: z.string().min(1, '请选择结束时间'),
  timestamp: z.string().optional(),
  notes: z.string().optional(),
}).refine((data) => {
  const start = new Date(data.startTime);
  const end = new Date(data.endTime);
  return end > start;
}, {
  message: '结束时间必须晚于开始时间',
  path: ['endTime'],
});

// 类型导出
export type PhoneLoginFormData = z.infer<typeof phoneLoginSchema>;
export type EmailLoginFormData = z.infer<typeof emailLoginSchema>;
export type PhoneRegisterFormData = z.infer<typeof phoneRegisterSchema>;
export type EmailRegisterFormData = z.infer<typeof emailRegisterSchema>;
export type BabyProfileFormData = z.infer<typeof babyProfileSchema>;
export type FeedingRecordFormData = z.infer<typeof feedingRecordSchema>;
export type SleepRecordFormData = z.infer<typeof sleepRecordSchema>;

// 兼容性类型
export type LoginFormData = PhoneLoginFormData;
export type RegisterFormData = PhoneRegisterFormData;