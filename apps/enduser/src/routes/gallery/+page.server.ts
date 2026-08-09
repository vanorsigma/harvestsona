import { handleGetHarvestsonas } from '$lib/server/getHarvestsonas';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => ({
  user: locals.user,
  ...(await handleGetHarvestsonas(locals, url))
});
