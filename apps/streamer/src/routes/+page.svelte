<script lang="ts">
  import { goto } from '$app/navigation';
  import { listen, type UnlistenFn } from '@tauri-apps/api/event';
  import { info } from '@tauri-apps/plugin-log';
  import { onMount } from 'svelte';
  import { invoke } from '@tauri-apps/api/core';
  import { load } from '@tauri-apps/plugin-store';
  import { getCurrentWindow } from '@tauri-apps/api/window';

  onMount(() => {
    info('Root page mounted');

    let unlistenAuth: UnlistenFn | null = null;
    let unlistenLoggedOut: UnlistenFn | null = null;
    let unlistenAppDataCleared: UnlistenFn | null = null;

    (async () => {
      const store = await load('config.json');
      const origin = await store.get('enduser_origin');
      if (!origin) {
        info('Redirecting to onboarding');
        await getCurrentWindow().show();
        await goto('/onboarding');
        return;
      }

      const auth_completed = await invoke<boolean>('is_auth_complete');
      if (auth_completed) {
        const initial_completed = await store.get('initial_completed');
        const isInitial = typeof initial_completed === 'boolean' ? initial_completed : false;
        if (!isInitial) {
          info('Auth completed but initial sync not done, redirecting to /di');
          await goto('/di');
        } else {
          info('Auth completed and initial sync done, redirecting to /normal');
          await goto('/normal');
        }
        return;
      }

      unlistenAuth = await listen<{ initial_completed: boolean }>(
        'auth-complete',
        async (event) => {
          const { initial_completed } = event.payload;
          info(
            `Authentication completed, the user has completed the initial sync? ${initial_completed}`
          );
          if (!initial_completed) await goto('/di');
          else await goto('/normal');
        }
      );

      unlistenLoggedOut = await listen('logged-out', async () => {
        info('Logged out event received, beginning re-authentication');
        const in_progress = await invoke<boolean>('is_auth_in_progress');
        if (!in_progress) {
          await invoke('begin_auth');
        }
      });

      unlistenAppDataCleared = await listen('app-data-cleared', async () => {
        info('App data cleared, redirecting to onboarding');
        await goto('/onboarding');
      });

      info('No valid session, beginning authentication');
      const in_progress = await invoke<boolean>('is_auth_in_progress');
      if (!in_progress) {
        await invoke('begin_auth');
      }
    })();

    return () => {
      if (unlistenAuth) unlistenAuth();
      if (unlistenLoggedOut) unlistenLoggedOut();
      if (unlistenAppDataCleared) unlistenAppDataCleared();
    };
  });
</script>

<div>(Root) This page was not meant to be observed.</div>
