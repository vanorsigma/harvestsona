import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getWebSocketProxy, serializeLogEntry } from '$lib/server/wsproxy/proxy';

export const load: PageServerLoad = async ({ locals }) => {
  const adminRepo = locals.repositories?.admins;
  const usersRepo = locals.repositories?.users;
  if (!adminRepo) throw error(500, 'Cannot get admin repository to show an admin page');
  if (!usersRepo) throw error(500, 'Cannot get user repository to show an admin page');

  if (!locals.user?.id) throw error(400, 'Cannot proceed without a logged in user');

  const user = await usersRepo.getUser(locals.user.id);
  if (!user) throw error(400);

  if (!(await adminRepo.hasScope(user.user, ['harvestsona:approve']))) {
    throw error(403, 'No authorization to approve harvestsonas');
  }

  return {
    user,
    pending: await usersRepo.getPendingApprovals()
  };
};

export const actions: Actions = {
  approve: async ({ request, locals, platform }) => {
    const data = await request.formData();
    const uids = data.getAll('uid').map(String);

    if (!uids) return fail(400, { error: 'UIDs invalid', values: { uids } });
    if (!platform)
      return fail(500, {
        error: 'Server does not have the resources to complete this request',
        values: { uids }
      });
    if (!locals.scopes.includes('harvestsona:approve')) return fail(403);
    if (!locals.sync?.db)
      return fail(500, {
        error: 'Server does not have the resources to complete this request',
        values: { uids }
      });
    const users = (await Promise.all(uids.map((uid) => locals.repositories?.users?.getUser(uid))))
      .filter((u) => u)
      .map((u) => u!.user);
    const results = (await locals.repositories?.moderation?.pushUpdates(users)) ?? [];
    const syncdb = locals.sync.db;
    const ws = getWebSocketProxy(platform);

    for (const r of results) {
      if (r.previousFilename) {
        const repl = await syncdb.append('CREATE', r.filename, r.hash, r.timestamp.getTime());
        void (await ws?.broadcastMessage(serializeLogEntry(repl)));
        const del = await syncdb.append('DELETE', r.previousFilename, '', Date.now());
        void (await ws?.broadcastMessage(serializeLogEntry(del)));
      } else {
        const entry = await syncdb.append('CREATE', r.filename, r.hash, r.timestamp.getTime());
        void (await ws?.broadcastMessage(serializeLogEntry(entry)));
      }
    }

    return { success: true };
  },

  deny: async ({ request, locals }) => {
    const data = await request.formData();
    const uids = data.getAll('uid').map(String);

    if (!uids) return fail(400, { error: 'UIDs invalid', values: { uids } });
    if (!locals.scopes.includes('harvestsona:approve')) return fail(403);
    const users = (await Promise.all(uids.map((uid) => locals.repositories?.users?.getUser(uid))))
      .filter((u) => u)
      .map((u) => u!.user);
    void (await locals.repositories?.moderation?.deleteUpdates(users));
    return { success: true };
  }
};
