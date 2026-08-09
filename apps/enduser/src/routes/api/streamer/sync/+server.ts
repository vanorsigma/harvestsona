import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request, platform, locals }) => {
  console.log('[ws-debug] In streamer/sync endpoint:', {
    upgrade: request.headers.get('Upgrade'),
    connection: request.headers.get('Connection'),
    'sec-websocket-version': request.headers.get('Sec-WebSocket-Version'),
    'sec-websocket-key': request.headers.get('Sec-WebSocket-Key'),
    dev: import.meta.env.DEV,
    testing: request.headers.get('Testing')
  });

  if (!platform?.env.WEBSOCKET_SERVICE) {
    console.error('[prod] WEBSOCKET_SERVICE binding is missing from the environment');
    throw error(500, 'Missing resources to complete your request.');
  }

  if (!import.meta.env.DEV) {
    console.log('[prod] WEBSOCKET_SERVICE binding confirmed present');
  }

  if (!locals.user?.id || locals.user?.id !== platform.env.STREAMER_ADMIN_ID)
    throw error(403, 'Unauthorized, you must be the streamer to use this endpoint');

  if (import.meta.env.DEV) {
    return new Response('WebSocket upgrades are handled by the dev server plugin', { status: 426 });
  } else {
    const id = platform.env.WEBSOCKET_SERVICE.idFromName('sync');
    const stub = platform.env.WEBSOCKET_SERVICE.get(id);

    return stub.fetch(request);
  }
};
