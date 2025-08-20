import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const response = NextResponse.json({
      success: true,
      message: '登出成功',
    });

    // 清除认证cookie
    response.cookies.set('auth-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0, // 立即过期
    });

    return response;

  } catch {
    console.error('Logout error');
    return NextResponse.json(
      { error: '登出失败' },
      { status: 500 }
    );
  }
}