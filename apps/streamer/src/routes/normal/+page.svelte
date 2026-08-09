<script lang="ts">
  import { goto } from '$app/navigation';
  import { initializeSyncflareClient } from '$lib';
  import { clearPendingSyncEntries } from '$lib/initial/cache';
  import { listen, type UnlistenFn } from '@tauri-apps/api/event';
  import { getCurrentWindow } from '@tauri-apps/api/window';
  import { load } from '@tauri-apps/plugin-store';
  import { info } from '@tauri-apps/plugin-log';
  import { onMount } from 'svelte';

  onMount(() => {
    info('Running on normal mode');
    getCurrentWindow().hide();
    const result = initializeSyncflareClient();
    let unlisten: UnlistenFn | undefined;
    let unlistenLiveSync: UnlistenFn | null = null;
    let unlistenLoggedOut: UnlistenFn | null = null;
    let unlistenAppDataCleared: UnlistenFn | null = null;
    let unlistenHostUrlChanged: UnlistenFn | null = null;
    let unlistenPushComplete: UnlistenFn | null = null;
    let syncStarted = false;

    (async () => {
      try {
        await result.ready();
      } catch (e) {
        info(`Failed to open sync database: ${e}`);
        return;
      }

      info('registering push-sync-completed listener...');
      try {
        unlistenPushComplete = await listen('push-sync-completed', () => {
          info('*** push-sync-completed RECEIVED ***');
          info('Push sync completed, re-syncing with server');
          result.client
            .boot()
            .then(() => {
              info('Re-synced with server after push');
            })
            .catch((e: unknown) => {
              info(`Server re-sync after push failed: ${e}`);
            });
        });
        info('push-sync-completed listener REGISTERED OK');
      } catch (e) {
        info(`FAILED to register push-sync-completed: ${e}`);
      }

      unlisten = await listen<string>('sync-ws', async (event) => {
        info('Received a websocket sync request: ', event.payload);
        await result.client.handleWebSocketMessage(event.payload);
      });

      unlistenLiveSync = await listen<boolean>('live-sync-changed', async (event) => {
        info(`Live sync changed to ${event.payload}`);
        if (event.payload && !syncStarted) {
          try {
            await result.client.boot();
            await result.fileLayer.startWatch();
            await result.client.startLiveSync();
            syncStarted = true;
          } catch (e) {
            info(`Failed to start live sync: ${e}`);
          }
        } else if (!event.payload && syncStarted) {
          await result.client.stop();
          syncStarted = false;
        }
      });

      unlistenLoggedOut = await listen('logged-out', async () => {
        info('Logged out, stopping sync and redirecting to root');
        if (syncStarted) {
          await result.client.stop();
          syncStarted = false;
        }
        await goto('/');
      });

      unlistenAppDataCleared = await listen('app-data-cleared', async () => {
        info('App data cleared, stopping sync and redirecting to onboarding');
        if (syncStarted) {
          await result.client.stop();
          syncStarted = false;
        }
        await goto('/onboarding');
      });

      unlistenHostUrlChanged = await listen('host-url-changed', async () => {
        info('Host URL changed, stopping sync and clearing cookies');
        if (syncStarted) {
          await result.client.stop();
          syncStarted = false;
        }
        await goto('/');
      });

      const store = await load('config.json');
      const liveSync = await store.get('live_sync');
      const enabled = typeof liveSync === 'boolean' ? liveSync : true;

      if (enabled) {
        try {
          info('booting sync client...');
          await result.client.boot();
          info('sync boot complete, starting watch...');
          await result.fileLayer.startWatch();
          await result.client.startLiveSync();
          syncStarted = true;
        } catch (e) {
          info(`Failed to start sync: ${e}`);
        }
      }
    })();

    return () => {
      if (unlisten) unlisten();
      if (unlistenLiveSync) unlistenLiveSync();
      if (unlistenLoggedOut) unlistenLoggedOut();
      if (unlistenAppDataCleared) unlistenAppDataCleared();
      if (unlistenHostUrlChanged) unlistenHostUrlChanged();
      if (unlistenPushComplete) unlistenPushComplete();
      result.onDestroy();
    };
  });
</script>

<div>(Normal) This page is not meant to be observed.</div>
