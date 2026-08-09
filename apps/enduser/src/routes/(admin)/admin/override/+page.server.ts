import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { applyHarvestsonaReplacement } from '$lib/server/applyHarvestsonaReplacement';

export const load: PageServerLoad = async ({ locals }) => {
  const adminRepo = locals.repositories?.admins;
  const usersRepo = locals.repositories?.users;
  if (!adminRepo) throw error(500, 'Cannot get admin repository to show an admin page');
  if (!usersRepo) throw error(500, 'Cannot get user repository to show an admin page');

  if (!locals.user?.id) throw error(400, 'Cannot proceed without a logged in user');

  const user = await usersRepo.getUser(locals.user.id);
  if (!user) throw error(400);

  if (!(await adminRepo.hasScope(user.user, ['harvestsona:approve']))) {
    throw error(403, 'No authorization to override harvestsonas');
  }

  const userList = await usersRepo.getAllUsers();

  return {
    user,
    userList
  };
};

export const actions: Actions = {
  override: async ({ request, locals, platform }) => {
    if (!locals.scopes.includes('harvestsona:approve')) return fail(403);
    if (!platform) return fail(500);

    const data = await request.formData();
    const username = data.get('username')?.toString();
    const file = data.get('file');

    if (!username) return fail(400, { error: 'No username provided' });
    if (!(file instanceof File)) return fail(400, { error: 'No file provided' });

    const usersRepo = locals.repositories?.users;
    if (!usersRepo) return fail(500);

    console.info(`[override] looking up user "${username}" by name`);
    const target = await usersRepo.getUserByName(username);
    if (!target) return fail(400, { error: `User "${username}" not found` });
    console.info(
      `[override] found target: uid=${target.uid} username=${target.username} currentFilename=${target.currentFilename ?? 'none'}`
    );

    try {
      console.info(`[override] applying replacement: username=${target.username} -> newFile`);
      const result = await applyHarvestsonaReplacement(
        locals,
        platform,
        { uid: target.uid, username: target.username },
        file
      );
      console.info(
        `[override] replacement done: username=${target.username} -> filename=${result.filename}`
      );
      return { success: true, username: target.username, filename: result.filename };
    } catch (e) {
      return fail(400, { error: `${e}` });
    }
  }
};
