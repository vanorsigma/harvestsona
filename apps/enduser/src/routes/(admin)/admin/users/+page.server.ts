import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { makeCanonicalStorageProvider } from '$lib/server/uploadHarvestsona';
import { SCOPES, type Scope } from '@harvestsona/shared';

export const load: PageServerLoad = async ({ locals }) => {
  const adminRepo = locals.repositories?.admins;
  const usersRepo = locals.repositories?.users;
  if (!adminRepo) throw error(500, 'Cannot get admin repository to show an admin page');
  if (!usersRepo) throw error(500, 'Cannot get user repository to show an admin page');

  if (!locals.user?.id) throw error(400, 'Cannot proceed without a logged in user');

  const user = await usersRepo.getUser(locals.user.id);
  if (!user) throw error(400);

  if (!(await adminRepo.isAdmin(user.user))) throw error(403, 'No authorization to view user list');

  const adminList = await adminRepo.getAdmins();
  const admins = Object.fromEntries(new Map(adminList?.map((a) => [a.user.uid, a.scopes])));
  const userList = await usersRepo.getAllUsers();

  return {
    user,
    userList,
    admins
  };
};

export const actions: Actions = {
  ban: async ({ request, locals, platform }) => {
    const data = await request.formData();
    const uid = data.get('uid')?.toString();
    const reason = data.get('reason')?.toString();
    if (!uid) return fail(400, { error: 'UID invalid', values: { uid } });
    if (!locals.user || !locals.scopes.includes('user:ban')) return fail(403);
    if (uid === locals.user.id || uid === platform?.env.STREAMER_ADMIN_ID) return fail(400);

    const user = await locals.repositories?.users?.getUser(uid);
    if (!user) return fail(400);
    void (await locals.repositories?.users?.banUser(
      { uid: locals.user.id, username: locals.user.name },
      user.user,
      reason ?? ''
    ));

    return { success: true };
  },

  unban: async ({ request, locals, platform }) => {
    const data = await request.formData();
    const uid = data.get('uid')?.toString();
    if (!uid) return fail(400, { error: 'UID invalid', values: { uid } });
    if (!locals.user || !locals.scopes.includes('user:ban')) return fail(403);
    if (uid === locals.user.id || uid === platform?.env.STREAMER_ADMIN_ID) return fail(400);

    const user = await locals.repositories?.users?.getUser(uid);
    if (!user) return fail(400);
    void (await locals.repositories?.users?.unbanUser(
      { uid: locals.user.id, username: locals.user.name },
      user.user
    ));

    return { success: true };
  },

  deleteUser: async ({ request, locals, platform }) => {
    if (!platform)
      throw error(500, 'Backend is missing required parameters to process your request');

    const data = await request.formData();
    const uid = data.get('uid')?.toString();
    if (!uid) return fail(400, { error: 'UID invalid', values: { uid } });
    if (!locals.user || !locals.scopes.includes('user:delete')) return fail(403);
    if (uid === locals.user.id || uid === platform?.env.STREAMER_ADMIN_ID) return fail(400);

    const user = await locals.repositories?.users?.getUser(uid);
    if (!user) return fail(400);
    const harvestsona = await locals.repositories?.harvestsonas?.getHarvestsona(user.user);
    const storageProvider = makeCanonicalStorageProvider(platform);

    if (harvestsona?.harvestsonaImage)
      void (await storageProvider.delete(harvestsona.harvestsonaImage));

    if (harvestsona?.pendingHarvestsonaImage)
      void (await storageProvider.delete(harvestsona.pendingHarvestsonaImage));

    void (await locals.repositories?.users?.deleteUser(user.user));
    return { success: true };
  },

  appointAdmin: async ({ request, locals, platform }) => {
    const data = await request.formData();
    const uid = data.get('uid')?.toString();
    const requestedScopes = data
      .getAll('scopes')
      .map(String)
      .filter((s) => (SCOPES as readonly string[]).includes(s)) as Scope[];

    if (!uid) return fail(400, { error: 'UID invalid', values: { uid } });
    if (!locals.user || !locals.scopes.includes('admin:appoint')) return fail(403);
    if (uid === locals.user.id || uid === platform?.env.STREAMER_ADMIN_ID) return fail(400);

    // An admin may only provision scopes they themselves hold. Any requested
    // scope outside the acting admin's own scopes is rejected outright.
    const disallowed = requestedScopes.filter((s) => !locals.scopes.includes(s));
    if (disallowed.length > 0) {
      return fail(403, {
        error: 'Cannot grant scopes you do not possess',
        disallowed
      });
    }

    const user = await locals.repositories?.users?.getUser(uid);
    if (!user) return fail(400);
    void (await locals.repositories?.admins?.appointAdmin(
      { uid: locals.user.id, username: locals.user.name },
      user.user,
      requestedScopes
    ));
    return { success: true };
  },

  removeAdmin: async ({ request, locals, platform }) => {
    const data = await request.formData();
    const uid = data.get('uid')?.toString();

    if (!uid) return fail(400, { error: 'UID invalid', values: { uid } });
    if (!locals.user || !locals.scopes.includes('admin:remove')) return fail(403);
    if (uid === locals.user.id || uid === platform?.env.STREAMER_ADMIN_ID) return fail(400);

    const user = await locals.repositories?.users?.getUser(uid);
    if (!user) return fail(400);
    void (await locals.repositories?.admins?.removeAdmin(
      { uid: locals.user.id, username: locals.user.name },
      user.user
    ));
    return { success: true };
  },

  updateScopes: async ({ request, locals, platform }) => {
    const data = await request.formData();
    const uid = data.get('uid')?.toString();
    const requestedScopes = data
      .getAll('scopes')
      .map(String)
      .filter((s) => (SCOPES as readonly string[]).includes(s)) as Scope[];

    if (!uid) return fail(400, { error: 'UID invalid', values: { uid } });
    if (!locals.user || !locals.scopes.includes('admin:appoint')) return fail(403);
    if (uid === locals.user.id || uid === platform?.env.STREAMER_ADMIN_ID) return fail(400);

    // An admin may only provision scopes they themselves hold; any requested
    // scope outside the acting admin's own scopes is rejected.
    const disallowed = requestedScopes.filter((s) => !locals.scopes.includes(s));
    if (disallowed.length > 0) {
      return fail(403, {
        error: 'Cannot grant scopes you do not possess',
        disallowed
      });
    }

    const user = await locals.repositories?.users?.getUser(uid);
    if (!user) return fail(400);
    void (await locals.repositories?.admins?.updateScopes(
      { uid: locals.user.id, username: locals.user.name },
      user.user,
      requestedScopes
    ));
    return { success: true };
  }
};
