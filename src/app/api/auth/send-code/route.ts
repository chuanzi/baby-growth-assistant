import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

const sendCodeSchema = z.object({
  phone: z.string().regex(/^1[3-9]\d{9}$/, '手机号格式不正确'),
  type: z.enum(['login', 'register'], { message: '类型参数必需' }),
});

// 模拟验证码存储（生产环境应使用Redis）
const verificationCodes = new Map<string, { code: string; expiry: number; attempts: number }>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, type } = sendCodeSchema.parse(body);

    // 检查发送频率限制
    const codeData = verificationCodes.get(phone);
    if (codeData && Date.now() - (codeData.expiry - 5 * 60 * 1000) < 60 * 1000) {
      return NextResponse.json(
        { error: '发送过于频繁，请稍后再试' },
        { status: 429 }
      );
    }

    // 检查用户是否存在
    const existingUser = await prisma.user.findUnique({
      where: { phone }
    });

    if (type === 'register' && existingUser) {
      return NextResponse.json(
        { error: '该手机号已注册，请直接登录' },
        { status: 400 }
      );
    }

    if (type === 'login' && !existingUser) {
      return NextResponse.json(
        { error: '该手机号未注册，请先注册' },
        { status: 400 }
      );
    }

    // 生成6位验证码
    const code = Math.random().toString().slice(-6).padStart(6, '0');
    const expiry = Date.now() + 5 * 60 * 1000; // 5分钟过期

    // 存储验证码
    verificationCodes.set(phone, {
      code,
      expiry,
      attempts: 0
    });

    // 模拟发送短信（生产环境需要接入真实短信服务）
    console.log(`[SMS] 发送验证码到 ${phone}: ${code}`);
    
    // TODO: 在这里接入真实的短信服务
    // await smsService.sendVerificationCode(phone, code);

    return NextResponse.json({ 
      success: true, 
      message: '验证码已发送',
      // 开发环境下返回验证码方便测试
      ...(process.env.NODE_ENV === 'development' && { code })
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || '参数验证失败' },
        { status: 400 }
      );
    }

    console.error('Send code error:', error);
    return NextResponse.json(
      { error: '服务器错误，请稍后重试' },
      { status: 500 }
    );
  }
}

// 导出验证码验证函数供其他API使用
export function verifyCode(phone: string, code: string): boolean {
  const codeData = verificationCodes.get(phone);
  
  if (!codeData) {
    return false;
  }

  // 检查过期
  if (Date.now() > codeData.expiry) {
    verificationCodes.delete(phone);
    return false;
  }

  // 检查尝试次数
  if (codeData.attempts >= 3) {
    verificationCodes.delete(phone);
    return false;
  }

  // 验证码错误
  if (codeData.code !== code) {
    codeData.attempts++;
    return false;
  }

  // 验证成功，删除验证码
  verificationCodes.delete(phone);
  return true;
}