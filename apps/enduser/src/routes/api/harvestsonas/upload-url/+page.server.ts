import { handleUpload } from '$lib/server/uploadHarvestsona';
import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions: Actions = {
  // there is an implicit assumption that we have authenticated
  upload: async ({ request, platform, locals }) => {
    if (!locals.user) return fail(401, { reason: 'unauthorized' });
    return await handleUpload(locals, request, platform);
  }
};
