import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from './auth';

/**
 * Extract authentication token from request
 * Checks both Authorization header (Bearer token) and cookies
 */
export function getAuthToken(request: NextRequest): string | null {
  // Check Authorization header first
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // Check cookies as fallback
  return request.cookies.get('auth-token')?.value || null;
}

/**
 * Verify authentication and return error response if unauthorized
 * Returns null if authenticated, or an error response if not
 */
export function requireAuth(request: NextRequest): NextResponse | null {
  const token = getAuthToken(request);
  
  if (!token) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Authentication token required' },
      { status: 401 }
    );
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Invalid or expired token' },
      { status: 401 }
    );
  }

  return null; // Authenticated
}

/**
 * Wrapper for authenticated route handlers
 * Automatically handles authentication and error handling
 */
export function withAuth(
  handler: (request: NextRequest, userId: number, username: string) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      const authError = requireAuth(request);
      if (authError) {
        return authError;
      }

      const token = getAuthToken(request);
      const decoded = verifyToken(token!); // Safe because requireAuth already checked
      
      if (!decoded) {
        return NextResponse.json(
          { error: 'Unauthorized', message: 'Invalid token' },
          { status: 401 }
        );
      }

      return await handler(request, decoded.userId, decoded.username);
    } catch (error) {
      console.error('Route handler error:', error);
      return NextResponse.json(
        { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  };
}

