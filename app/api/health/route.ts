import { NextResponse } from 'next/server';

export async function GET() {
  const checks = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    venice_api: !!process.env.VENICE_API_KEY,
  };

  const allOk = checks.venice_api;

  return NextResponse.json(
    { ...checks, healthy: allOk },
    { status: allOk ? 200 : 503 }
  );
}
