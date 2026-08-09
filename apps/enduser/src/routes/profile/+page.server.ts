import { handleUpload } from '$lib/server/uploadHarvestsona';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const { user, session } = locals;
  const harvestsonaInfo =
    (user?.id ?? false)
      ? await locals.repositories?.harvestsonas?.getHarvestsona({
          uid: user!.id,
          username: user!.name
        })
      : null;

  return {
    user,
    session,
    currentFilename: harvestsonaInfo?.harvestsonaImage,
    pendingFilename: harvestsonaInfo?.pendingHarvestsonaImage
  };
};

export const actions: Actions = {
  default: ({ locals, request, platform }) => handleUpload(locals, request, platform)
};
