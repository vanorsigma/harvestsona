import { error, redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, url }) => {
  // the login path should be the only unauthenticated path
  if (url.pathname.startsWith('/login/') || url.pathname === '/login') return;

  const { user, session } = locals;
  if (!session || !user) throw redirect(303, '/login');

  const isBanned = await locals.repositories?.users?.isBanned(user.id);
  if (isBanned)
    throw error(
      403,
      'You have been banned from this site. Please contact the server administrator for more information.'
    );

  return { user, scopes: locals.scopes ?? [] };
};
