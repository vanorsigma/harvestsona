import { makeCanonicalStorageProvider } from '$lib/server/uploadHarvestsona';
import { error, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { fileTypeStream } from 'file-type';
import { DefaultHarvestsonaPath } from '@harvestsona/shared';

const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

function isUUID(value: unknown): value is string {
  return typeof value === 'string' && UUID_REGEX.test(value);
}

export const GET: RequestHandler = async ({ platform, params }) => {
  const harvestsonaId = params.id;
  if (!platform) throw error(500, 'Backend is missing required parameters to process your request');

  if (harvestsonaId === DefaultHarvestsonaPath) return redirect(307, `/${DefaultHarvestsonaPath}`);
  if (!isUUID(harvestsonaId)) return redirect(307, `/${DefaultHarvestsonaPath}`);

  const storageProvider = makeCanonicalStorageProvider(platform);
  const rawDataStream = await storageProvider.getData(harvestsonaId);
  if (!rawDataStream)
    throw error(400, 'Harvestsona ID did not yield a valid data stream. Is it valid?');
  const typedDataStream = await fileTypeStream(rawDataStream);
  const fileTypeResult = typedDataStream.fileType;
  if (!fileTypeResult) throw error(500, 'Uploaded Harvestsona ID does not have inferred file type');

  return new Response(typedDataStream as unknown as ReadableStream, {
    headers: {
      'Content-Type': fileTypeResult.mime,
      'Cache-Control': 'public, max-age=86400',
      'Content-Disposition': 'inline'
    }
  });
};

export const DELETE: RequestHandler = async ({ platform, params, locals }) => {
  const harvestsonaId = params.id;
  if (!platform) throw error(500, 'Backend is missing required parameters to process your request');
  if (!isUUID(harvestsonaId)) throw error(400, 'Invalid Harvestsona ID');

  // Only admins holding the `user:delete` scope may delete stored harvestsonas.
  if (!locals.user || !locals.scopes?.includes('user:delete')) {
    throw error(403, 'You do not have permission to delete a harvestsona');
  }

  const storageProvider = makeCanonicalStorageProvider(platform);
  void (await storageProvider.delete(harvestsonaId));

  return new Response(null, { status: 204 });
};
