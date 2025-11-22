import { NextRequest, NextResponse } from 'next/server';
import { executeCode } from '@/lib/codeExecution';

export async function POST(req: NextRequest) {
  try {
    const { language, code, stdin } = await req.json();

    if (!language || !code) {
      return NextResponse.json(
        { error: 'Language and code are required' },
        { status: 400 }
      );
    }

    const result = await executeCode(language, code, stdin);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Execute API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to execute code' },
      { status: 500 }
    );
  }
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': 'http://localhost:3000',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}
