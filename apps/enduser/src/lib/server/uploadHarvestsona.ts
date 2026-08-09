import { dev } from '$app/environment';
import type { R2Bucket } from '@cloudflare/workers-types';
import { MAX_HARVESTSONA_SIZE } from '@harvestsona/shared';
import {
  LocalStorageProvider,
  R2StorageProvider,
  type StorageProvider
} from '@harvestsona/storage';
import { fail } from '@sveltejs/kit';
import { fileTypeFromBuffer } from 'file-type';
import { hashStream } from 'syncflare';

const enableLocalStorageProvider = false;

export function makeCanonicalStorageProvider(platform: Readonly<App.Platform>): StorageProvider {
  return dev && enableLocalStorageProvider
    ? new LocalStorageProvider()
    : new R2StorageProvider(platform.env.UPLOAD_BUCKET as any as R2Bucket);
}

export async function handleUpload(
  locals: App.Locals,
  request: Request,
  platform: App.Platform | undefined
) {
  if (!platform) return fail(500, { reason: 'platform_missing' });

  const formData = await request.formData();
  const file = formData.get('file');

  // file checks
  if (!(file instanceof File)) return fail(400, { reason: 'file_data_invalid' });
  if (file.size === 0) return fail(400, { reason: 'file_data_missing' });
  if (file.size > MAX_HARVESTSONA_SIZE) return fail(400, { reason: 'file_data_too_big' });
  if (!locals.user) return fail(500, { reason: 'unexpected_authentication_issue' });

  const sniffBytes = await file.slice(0, 4100).arrayBuffer();
  const detected = await fileTypeFromBuffer(new Uint8Array(sniffBytes));

  const provider = makeCanonicalStorageProvider(platform);

  if (!detected || detected.mime !== file.type)
    return fail(400, { reason: 'Inferred mime type does not match reported mime type' });

  if (!locals.repositories)
    console.warn('No repositories detected! This is likely a misconfiguration.');

  if (!locals.repositories?.harvestsona)
    console.warn('No harvestsona provider found. This is likely a misconfiguration.');

  const pendingFilename = (
    await locals.repositories?.harvestsonas?.getHarvestsona({
      uid: locals.user?.id,
      username: locals.user?.name
    })
  )?.pendingHarvestsonaImage;

  const hash = await hashStream(file.stream());
  const filename = crypto.randomUUID().toString();
  if (!(await provider.upload(filename, file)))
    return fail(500, { reason: 'server failed to save the file' });

  if (pendingFilename) await provider.delete(pendingFilename);
  if (
    !(await locals.repositories?.harvestsona?.requestUpdate(
      { uid: locals.user?.id, username: locals.user?.name },
      filename,
      hash,
      new Date()
    ))
  )
    console.warn('Unable to request an update to the repository');
  console.log(`Successfully saved pending HarvestSona for ${locals.user?.name}`);

  return {
    filename
  };
}
