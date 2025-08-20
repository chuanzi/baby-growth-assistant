import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { signToken } from '@/lib/auth';
import { phoneLoginSchema, emailLoginSchema } from '@/lib/validations';
import { verifyCode } from '../send-code/route';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { method = 'phone' } = body;

    let user;

    if (method === 'phone') {
      // 手机号登录
      const { phone, verificationCode } = phoneLoginSchema.parse(body);

      // 验证验证码
      if (!verifyCode(phone, verificationCode)) {
        return NextResponse.json(
          { error: '验证码错误或已过期' },
          { status: 400 }
        );
      }

      // 查找用户
      user = await prisma.user.findUnique({
        where: { phone },
        include: {
          babies: true,
        },
      });

      if (!user) {
        return NextResponse.json(
          { error: '用户不存在，请先注册' },
          { status: 404 }
        );
      }
    } else if (method === 'email') {
      // 邮箱登录
      const { email, password } = emailLoginSchema.parse(body);

      // 查找用户
      user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        include: {
          babies: true,
        },
      });

      if (!user || !user.password) {
        return NextResponse.json(
          { error: '邮箱或密码错误' },
          { status: 401 }
        );
      }

      // 验证密码
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return NextResponse.json(
          { error: '邮箱或密码错误' },
          { status: 401 }
        );
      }
    } else {
      return NextResponse.json(
        { error: '不支持的登录方式' },
        { status: 400 }
      );
    }

    // 生成JWT token
    const token = await signToken({ 
      userId: user.id, 
      phone: user.phone,
      email: user.email 
    });

    // 设置cookie
    const response = NextResponse.json({
      success: true,
      message: '登录成功',
      user: {
        id: user.id,
        phone: user.phone,
        email: user.email,
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