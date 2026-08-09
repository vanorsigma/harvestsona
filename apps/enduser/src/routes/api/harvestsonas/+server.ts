import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { handleGetHarvestsonas } from '$lib/server/getHarvestsonas';

export const GET: RequestHandler = async ({ locals, url }) =>
  json(await handleGetHarvestsonas(locals, url));
