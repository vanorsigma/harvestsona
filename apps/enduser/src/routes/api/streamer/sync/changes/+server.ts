import { planChangeSet } from 'syncflare';
import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ request, locals, platform }) => {
  if (!locals.user?.id || locals.user?.id !== platform?.env.STREAMER_ADMIN_ID)
    throw error(403, 'Unauthorized, you must be the streamer to use this endpoint');

  const url = new URL(request.url);
  let after = Number(url.searchParams.get('after') ?? '0');
  if (isNaN(after)) after = 0;
  const entries = await locals.sync?.db?.range(after);
  if (!entries) throw error(500, 'No available range in the backend, this is usually an error');

  const ops = planChangeSet(entries);
  const latest = await locals.sync?.db?.latest();
  return json({
    entries: ops,
    latest
  });
};
