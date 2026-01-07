import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Just pass through - no auth required
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Skip static files
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
