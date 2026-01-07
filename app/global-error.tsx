'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to Sentry
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="max-w-md w-full bg-white rounded-xl border border-gray-200 p-8 text-center">
            <div className="text-5xl mb-4">😵</div>
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-gray-600 mb-6">
              An unexpected error occurred. We've been notified and are looking into it.
            </p>
            <div className="space-y-3">
              <button
                onClick={reset}
                className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
              >
                Try Again
              </button>
              <a
                href="/"
                className="block w-full py-3 border border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
              >
                Go Home
              </a>
            </div>
            {error.digest && (
              <p className="mt-4 text-xs text-gray-400">
                Error ID: {error.digest}
              </p>
            )}
          </div>
        </div>
      </body>
    </html>
  );
}
