import { ClientDatabase } from '$lib/sync/ClientDatabase';
import { ClientBacking } from '$lib/sync/ClientBacking';
import { TauriFileLayer } from '$lib/sync/TauriFileLayer';
import { SyncflareClient } from 'syncflare';
import { invoke } from '@tauri-apps/api/core';
import { HarvestsonaDefaultDBPath } from '@harvestsona/shared';
import { appLocalDataDir, join } from '@tauri-apps/api/path';
import { TauriLogger } from '$lib/sync/TauriLogger';

export interface InitializeReturnObject {
  client: SyncflareClient;
  fileLayer: TauriFileLayer;
  ready: () => Promise<void>;
  onDestroy: () => void;
}

export function initializeSyncflareClient(): InitializeReturnObject {
  const logger = new TauriLogger();
  const clientDb = new ClientDatabase();
  const clientBacking = new ClientBacking(logger);
  const fileLayer = new TauriFileLayer(logger);
  const client = new SyncflareClient({
    fileLayer,
    clientBacking,
    clientDb,
    getChangesEndpoint: async (after: number) => {
      logger.debug(`Attempting to get changes after: ${after}`);
      return invoke('streamer_get_changes', { after });
    },
    logger
  });

  let openPromise: Promise<void> | undefined;

  function ready(): Promise<void> {
    if (!openPromise) {
      openPromise = (async () => {
        const dbPath = await join(await appLocalDataDir(), HarvestsonaDefaultDBPath);
        logger.info(`attempting to open dbPath at ${dbPath}`);
        await clientDb.open(dbPath);
      })();
    }
    return openPromise;
  }

  return {
    client,
    fileLayer,
    ready,
    onDestroy: () => {
      client?.stop();
    }
  };
}
