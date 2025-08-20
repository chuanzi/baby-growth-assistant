import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { signToken } from '@/lib/auth';
import { phoneRegisterSchema, emailRegisterSchema } from '@/lib/validations';
import { verifyCode } from '../send-code/route';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { method = 'phone' } = body;

    let userData;

    if (method === 'phone') {
      // 手机号注册
      const { phone, verificationCode } = phoneRegisterSchema.parse(body);

      // 验证验证码
      if (!verifyCode(phone, verificationCode)) {
        return NextResponse.json(
          { error: '验证码错误或已过期' },
          { status: 400 }
        );
      }

      // 检查用户是否已存在
      const existingUser = await prisma.user.findUnique({
        where: { phone }
      });

      if (existingUser) {
        return NextResponse.json(
          { error: '该手机号已注册' },
          { status: 400 }
        );
      }

      userData = { phone };
    } else if (method === 'email') {
      // 邮箱注册
      const { email, password } = emailRegisterSchema.parse(body);

      // 检查用户是否已存在
      const existingUser = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
      });

      if (existingUser) {
        return NextResponse.json(
          { error: '该邮箱已注册' },
          { status: 400 }
        );
      }

      // 哈希密码
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      userData = { 
        email: email.toLowerCase(), 
        password: hashedPassword 
      };
    } else {
      return NextResponse.json(
        { error: '不支持的注册方式' },
        { status: 400 }
      );
    }

    // 创建新用户
    const user = await prisma.user.create({
      data: userData,
    });

    // 生成JWT token
    const token = await signToken({ 
      userId: user.id, 
      phone: user.phone,
      email: user.email 
    });

    // 设置cookie
    const response = NextResponse.json({
      success: true,
      message: '注册成功',
      user: {
        id: user.id,
        phone: user.phone,
        email: user.email,
        createdAt: user.createdAt,
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
    console.error('Register error:', error);
    return NextResponse.json(
      { error: '注册失败，请稍后重试' },
      { status: 500 }
    );
  }
}