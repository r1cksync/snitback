import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function authenticateRequest(req: NextRequest): Promise<{ userId: string } | null> {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token || !token.id) {
    return null;
  }

  return { userId: token.id as string };
}

export function unauthorizedResponse() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export function errorResponse(message: string, status = 500) {
  return NextResponse.json({ error: message }, { status });
}

export function successResponse(data: any, status = 200) {
  return NextResponse.json(data, { status });
}
