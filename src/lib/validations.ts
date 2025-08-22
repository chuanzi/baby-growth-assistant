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

// 里程碑验证
export const milestoneCompleteSchema = z.object({
  milestoneId: z.string().min(1, '里程碑ID不能为空'),
  achievedAt: z.string().datetime().optional(),
  notes: z.string().max(500, '备注不能超过500字符').optional(),
});

// 用户资料更新验证
export const updateProfileSchema = z.object({
  phone: z.string()
    .regex(phoneRegex, '请输入正确的手机号格式')
    .optional(),
  email: z.string()
    .regex(emailRegex, '请输入正确的邮箱格式')
    .toLowerCase()
    .optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string()
    .min(8, '密码至少8位字符')
    .max(100, '密码不能超过100位字符')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, '密码需包含大小写字母和数字')
    .optional(),
  confirmNewPassword: z.string().optional(),
}).refine(
  (data) => {
    if (data.newPassword && !data.currentPassword) return false;
    if (data.newPassword && data.newPassword !== data.confirmNewPassword) return false;
    return true;
  },
  {
    message: '密码验证失败',
    path: ['newPassword'],
  }
);

// 查询参数验证
export const timelineQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  type: z.enum(['feeding', 'sleep', 'milestone', 'all']).default('all'),
});

export const summaryQuerySchema = z.object({
  period: z.enum(['today', 'week', 'month']).default('today'),
});

export const trendsQuerySchema = z.object({
  period: z.coerce.number().min(1).max(90).default(7),
  type: z.enum(['feeding', 'sleep', 'all']).default('all'),
});

// API通用验证
export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export const babyIdParamSchema = z.object({
  babyId: z.string().min(1, '宝宝ID不能为空'),
});

export const milestoneIdParamSchema = z.object({
  milestoneId: z.string().min(1, '里程碑ID不能为空'),
});

// 文件上传验证
export const avatarUploadSchema = z.object({
  file: z.any().refine((file) => file instanceof File, '请选择文件'),
  maxSize: z.number().default(5 * 1024 * 1024), // 5MB
  allowedTypes: z.array(z.string()).default(['image/jpeg', 'image/png', 'image/webp']),
});

// 新增类型导出
export type MilestoneCompleteFormData = z.infer<typeof milestoneCompleteSchema>;
export type UpdateProfileFormData = z.infer<typeof updateProfileSchema>;
export type TimelineQueryData = z.infer<typeof timelineQuerySchema>;
export type SummaryQueryData = z.infer<typeof summaryQuerySchema>;
export type TrendsQueryData = z.infer<typeof trendsQuerySchema>;
export type PaginationData = z.infer<typeof paginationSchema>;
export type BabyIdParamData = z.infer<typeof babyIdParamSchema>;
export type MilestoneIdParamData = z.infer<typeof milestoneIdParamSchema>;

// 兼容性类型
export type LoginFormData = PhoneLoginFormData;
export type RegisterFormData = PhoneRegisterFormData;