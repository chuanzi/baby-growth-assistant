import { NextRequest, NextResponse } from 'next/server';
import { getSession, verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    
    console.log('Debug auth - token exists:', !!token);
    console.log('Debug auth - token value:', token ? token.substring(0, 20) + '...' : 'none');
    
    if (!token) {
      return NextResponse.json({
        status: 'no_token',
        token: null,
        session: null,
        error: 'No auth token found'
      });
    }
    
    const session = await getSession();
    console.log('Debug auth - session:', session);
    
    const verifiedToken = await verifyToken(token);
    console.log('Debug auth - verified token:', verifiedToken);
    
    return NextResponse.json({
      status: session ? 'authenticated' : 'invalid_token',
      token: token ? token.substring(0, 20) + '...' : null,
      session: session,
      verifiedToken: verifiedToken
    });
    
  } catch (error) {
    console.error('Debug auth error:', error);
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}