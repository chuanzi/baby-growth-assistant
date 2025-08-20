import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { signToken } from '@/lib/auth';
import { loginSchema } from '@/lib/validations';
import { verifyCode } from '../send-code/route';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, verificationCode } = loginSchema.parse(body);

    // 验证验证码
    if (!verifyCode(phone, verificationCode)) {
      return NextResponse.json(
        { error: '验证码错误或已过期' },
        { status: 400 }
      );
    }

    // 查找用户
    const user = await prisma.user.findUnique({
      where: { phone },
      include: {
        babies: true, // 包含宝宝信息
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: '用户不存在，请先注册' },
        { status: 404 }
      );
    }

    // 生成JWT token
    const token = await signToken({ userId: user.id, phone: user.phone });

    // 设置cookie
    const response = NextResponse.json({
      success: true,
      message: '登录成功',
      user: {
        id: user.id,
        phone: user.phone,
        createdAt: user.createdAt,
        babies: user.babies,
      },
    });

    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: '登录失败，请稍后重试' },
      { status: 500 }
    );
  }
}