import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * GET /api/auth/session
 * Returns the current user's session information from locals.user
 *
 * This endpoint is used by the frontend to check authentication status.
 * The user object is populated by hooks.server.ts
 */
export const GET: RequestHandler = async ({ locals }) => {
  // If user is authenticated, return user info
  if (locals.user) {
    return json({
      authenticated: true,
      user: {
        id: locals.user.id,
        email: locals.user.email,
      },
    });
  }

  // Not authenticated
  return json({
    authenticated: false,
    user: null,
  });
};
