import type { Handle } from '@sveltejs/kit';
import { building } from '$app/environment';
import { createAuth } from '$lib/server/auth';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import {
  D1AdminRepository,
  D1UserManagementRepository,
  D1Harvestsonas,
  D1HarvestsonasWithDevAccounts,
  getDb
} from '@harvestsona/database';
import { SCOPES } from '@harvestsona/shared';
import { SyncDatabase } from '$lib/server/SyncDatabase';

const handleAll: Handle = async ({ event, resolve }) => {
  if (event.request.headers.get('Upgrade') === 'websocket') {
    console.log('[ws-debug] WebSocket upgrade detected in hook:', {
      url: event.url.pathname,
      upgrade: event.request.headers.get('Upgrade'),
      connection: event.request.headers.get('Connection'),
      'sec-websocket-version': event.request.headers.get('Sec-WebSocket-Version'),
      'sec-websocket-key': event.request.headers.get('Sec-WebSocket-Key')
    });
  } else if (event.url.pathname === '/api/streamer/sync') {
    console.log('[ws-debug] /api/streamer/sync hit WITHOUT WebSocket upgrade header in hook:', {
      upgrade: event.request.headers.get('Upgrade'),
      connection: event.request.headers.get('Connection')
    });
  }

  const maintenanceMode = event.platform?.env?.MAINTENANCE_MODE;
  if (maintenanceMode && maintenanceMode.toLowerCase() !== 'false') {
    return new Response('The server is undergoing maintenance.', { status: 503 });
  }

  if (!event.platform?.env?.DB)
    throw new Error('D1 binding "DB" not found - are you running with wrangler?');

  event.locals.auth = createAuth(event.platform.env.DB);

  const { auth } = event.locals;
  const session = await auth.api.getSession({ headers: event.request.headers });

  if (event.platform?.env.DB && session) {
    event.locals.session = session.session;
    event.locals.user = session.user;

    const adminUserRepo = new D1AdminRepository(event.platform?.env.DB);
    const usersRepo = new D1UserManagementRepository(event.platform?.env.DB, adminUserRepo);
    let scopes = await adminUserRepo.getScopes({
      uid: session.user.id,
      username: session.user.name
    });
    const streamerId = event.platform.env.STREAMER_ADMIN_ID;

    if (streamerId && session.user.id === streamerId) {
      const user = await usersRepo.getUser(streamerId);
      if (user) {
        if (scopes === null || scopes.length === 0 || !SCOPES.every((s) => scopes?.includes(s))) {
          await adminUserRepo.appointAdmin(user.user, user.user, [...SCOPES]);
          scopes = await adminUserRepo.getScopes(user.user);
        }
      }
    }

    event.locals.scopes = scopes ? scopes : [];

    const d1Instance = import.meta.env.DEV
      ? new D1HarvestsonasWithDevAccounts(event.platform?.env.DB)
      : new D1Harvestsonas(event.platform?.env.DB);
    if (!event.locals.repositories) event.locals.repositories = {};
    if (!event.locals.sync) event.locals.sync = {};

    event.locals.repositories.moderation = d1Instance;
    event.locals.repositories.harvestsona = d1Instance;
    event.locals.repositories.harvestsonas = d1Instance;
    event.locals.repositories.admins = adminUserRepo;
    event.locals.repositories.users = usersRepo;

    event.locals.sync.db = new SyncDatabase(getDb(event.platform?.env.DB));
  }

  return svelteKitHandler({ event, resolve, auth, building });
};

export const handle: Handle = handleAll;
