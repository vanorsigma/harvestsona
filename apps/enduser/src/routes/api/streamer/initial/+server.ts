import { makeCanonicalStorageProvider } from '$lib/server/uploadHarvestsona';
import { fileDataSchema } from '@harvestsona/domain';
import { error, json, type RequestHandler } from '@sveltejs/kit';
import { hashStream } from 'syncflare';
import { getWebSocketProxy, serializeLogEntry } from '$lib/server/wsproxy/proxy';

function assertStreamerCanSync(
  request: Request,
  locals: App.Locals,
  platform: App.Platform | undefined,
  requireBody: boolean
) {
  console.debug(
    `User ID ${locals.user?.id ?? 'NULL'} tried to login. The current streamer admin ID is: ${platform?.env.STREAMER_ADMIN_ID ?? 'NULL'}`
  );
  if (!locals.user || locals.user.id !== platform?.env.STREAMER_ADMIN_ID)
    throw error(403, 'Only the streamer can use this endpoint.');
  if (requireBody && !request.body) throw error(400, 'No request body provided');
  if (!platform) throw error(500, 'The server cannot complete your request');
}

function doStream(
  platform: App.Platform,
  locals: App.Locals,
  reader: ReadableStreamDefaultReader<string>
): ReadableStream {
  const storageProvider = makeCanonicalStorageProvider(platform);
  const encoder = new TextEncoder();
  let progress = 0;
  let lineCount = 0;
  let errorCount = 0;
  return new ReadableStream(
    {
      async start(controller) {
        let buffer = '';
        try {
          console.debug('doStream: starting to read ndjson body');
          while (true) {
            const { value, done } = await reader.read();
            if (done) {
              console.debug(`doStream: reader done. Total lines parsed: ${lineCount}`);
              break;
            }
            buffer += value;
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';
            for (const line of lines) {
              if (!line) continue;
              lineCount++;

              let fileData;
              try {
                fileData = fileDataSchema.safeParse(JSON.parse(line));
              } catch {
                console.error(`doStream: [${lineCount}] invalid JSON line, skipping`);
                errorCount++;
                continue;
              }
              if (!fileData.success) {
                console.error('Stream parsing error, will skip', fileData.error);
                errorCount++;
                continue;
              }

              const username = fileData.data.username.toLowerCase();
              const b64Length = fileData.data.bodyAsBase64.length;
              console.debug(
                `doStream: [${lineCount}] processing ${username} (base64: ${b64Length} bytes)`
              );

              const filename = crypto.randomUUID().toString();

              try {
                const binaryStr = atob(fileData.data.bodyAsBase64);
                const binary = Uint8Array.from(binaryStr, (c) => c.charCodeAt(0));
                const rawBody = new Blob([binary]);
                console.debug(
                  `doStream: uploading ${username} as ${filename} (${rawBody.size} bytes)`
                );
                if (!(await storageProvider.upload(filename, rawBody)))
                  throw Error('Unable to upload file.');
                console.debug(`doStream: uploaded ${username} to ${filename}`);

                const hash = await hashStream(rawBody.stream());
                console.debug(`doStream: computed hash for ${username}: ${hash}`);

                const existing = await locals.repositories?.users?.getUserByName(username);
                let userId: string;
                let prevFilename: string | null = null;

                if (existing) {
                  userId = existing.uid;
                  prevFilename = existing.currentFilename;
                  console.debug(
                    `doStream: found existing user ${username} (uid: ${userId}, prevFile: ${prevFilename ?? 'none'})`
                  );
                } else {
                  console.debug(`doStream: creating new user ${username}`);
                  const internalAdapter = (await locals.auth.$context).internalAdapter;
                  const created = await internalAdapter.createUser({
                    name: username,
                    email: `${username}@placeholder.invalid`,
                    emailVerified: false
                  });
                  userId = created.id;
                  console.debug(`doStream: created user ${username} with id ${userId}`);
                }

                if (prevFilename) {
                  console.debug(`doStream: deleting previous file ${prevFilename} for ${username}`);
                  await storageProvider.delete(prevFilename);
                }

                console.debug(
                  `doStream: creating harvestsona record for ${username} -> ${filename}`
                );
                await locals.repositories?.harvestsona?.createHarvestsona(
                  { uid: userId, username },
                  filename,
                  hash,
                  new Date()
                );

                const ws = getWebSocketProxy(platform);
                const syncdb = locals.sync?.db;
                if (syncdb) {
                  const entry = await syncdb.append('CREATE', filename, hash, Date.now());
                  console.debug(`doStream: broadcasting CREATE for ${username}: ${filename}`);
                  await ws?.broadcastMessage(serializeLogEntry(entry));
                  if (prevFilename) {
                    const delEntry = await syncdb.append('DELETE', prevFilename, '', Date.now());
                    console.debug(`doStream: broadcasting DELETE for old file ${prevFilename}`);
                    await ws?.broadcastMessage(serializeLogEntry(delEntry));
                  }
                }

                progress += 1;
                const body = encoder.encode(`${JSON.stringify({ progress })}\n`);
                controller.enqueue(body);
                console.debug(`doStream: emitted progress ${progress} (completed ${username})`);
              } catch (e) {
                console.error(
                  `Initial sync failed for ${username} (line ${lineCount}), continuing with remaining entries`,
                  e
                );
                errorCount++;
                await storageProvider.delete(filename).catch(() => {});
              }
            }
          }
        } catch (e) {
          console.error('doStream: fatal error in stream processing', e);
          controller.error(e);
        } finally {
          console.debug(
            `doStream: done. Processed ${progress} files, ${errorCount} errors, ${lineCount} total lines.`
          );
          try {
            controller.close();
          } catch {
            console.debug('Controller was already closed, probably from an error.');
          }
        }
      }
    },
    new CountQueuingStrategy({ highWaterMark: 1024 })
  );
}

export const GET: RequestHandler = async ({ request, locals, platform }) => {
  assertStreamerCanSync(request, locals, platform, false);
  return json({});
};

export const POST: RequestHandler = async ({ request, locals, platform }) => {
  console.debug('POST initial sync endpoint hit');
  assertStreamerCanSync(request, locals, platform, true);

  const textStream = request.body!.pipeThrough(new TextDecoderStream());
  const reader = textStream.getReader();

  return new Response(doStream(platform!, locals, reader), {
    headers: {
      'Content-Type': 'application/jsonl'
    }
  });
};
