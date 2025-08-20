import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';

// 需要认证的路由
const protectedPaths = [
  '/dashboard',
  '/create-profile',
  '/profile',
  '/records',
  '/milestones',
];

// 认证页面路由（已登录用户不应访问）
const authPaths = ['/login', '/register'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('auth-token')?.value;

  // 验证token
  let isAuthenticated = false;
  if (token) {
    const session = await verifyToken(token);
    isAuthenticated = !!session;
  }

  // 如果是受保护的路由且用户未登录
  if (protectedPaths.some(path => pathname.startsWith(path)) && !isAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 如果是认证页面且用户已登录
  if (authPaths.some(path => pathname.startsWith(path)) && isAuthenticated) {
    const redirectUrl = request.nextUrl.searchParams.get('redirect') || '/dashboard';
    return NextResponse.redirect(new URL(redirectUrl, request.url));
  }

  // 根路径重定向逻辑
  if (pathname === '/') {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    } else {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};