import { error } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, platform }) => {
  console.debug(`User ${locals.user?.id} attempted to get a login token`);
  if (!platform) throw error(500, 'Server is not equipped to handle this request');

  if (!locals.user?.id || locals.user?.id !== platform.env.STREAMER_ADMIN_ID)
    throw error(403, 'Unauthorized, you must be the streamer to use this endpoint');
};
