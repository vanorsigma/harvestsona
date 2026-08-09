import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { HarvestsonaImageURL } from '@harvestsona/shared';

export const GET: RequestHandler = async ({ platform, locals }) => {
  if (!platform || !locals.repositories?.harvestsonas)
    throw error(500, 'Missing resources to complete your request.');

  if (!locals.user?.id || locals.user?.id !== platform.env.STREAMER_ADMIN_ID)
    throw error(403, 'Unauthorized, you must be the streamer to use this endpoint');

  const harvestsonasRepo = locals.repositories.harvestsonas;
  let allHarvestsonaMappings: { username: string; image: HarvestsonaImageURL }[] = [];

  let offset = 0;
  while (true) {
    const harvestsonas = await harvestsonasRepo.getHarvestsonas(offset);
    if (!harvestsonas) throw error(500, 'Failed to fetch harvestsonas from database');

    const mapped = harvestsonas.harvestsonas
      .filter((val) => val.harvestsonaImage)
      .map((val) => {
        const mapping = {
          username: val.user.username!,
          image: val.harvestsonaImage!
        };
        console.info(`[mappings] username=${mapping.username} -> image=${mapping.image}`);
        return mapping;
      });
    allHarvestsonaMappings = [...allHarvestsonaMappings, ...mapped];

    if (!harvestsonas.continuation) break;
    offset = harvestsonas.continuation;
  }

  console.info(`[mappings] returning ${allHarvestsonaMappings.length} total mappings`);
  return json(allHarvestsonaMappings);
};
