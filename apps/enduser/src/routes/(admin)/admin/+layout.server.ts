import { error } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, platform }) => {
  console.log(`[Admin] User ${locals.user?.name} has the ID ${locals.user?.id}`);
  if (locals.scopes.length === 0) throw error(403, 'Unauthorized');
  return {
    scopes: locals.scopes,
    streamerId: platform?.env.STREAMER_ADMIN_ID
  };
};
