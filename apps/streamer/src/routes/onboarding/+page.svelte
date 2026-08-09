<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount, onDestroy } from 'svelte';
  import { getCurrentWindow } from '@tauri-apps/api/window';
  import { invoke } from '@tauri-apps/api/core';
  import { listen, type UnlistenFn } from '@tauri-apps/api/event';
  import { error as logError, info } from '@tauri-apps/plugin-log';
  import UrlInputCard from '$lib/components/UrlInputCard.svelte';

  let originUrl = $state('');
  let errorMessage = $state('');
  let saving = $state(false);
  let authenticating = $state(false);
  let unlistenAuth: UnlistenFn | null = null;

  onMount(async () => {
    await getCurrentWindow().show();
  });

  function registerAuthListener() {
    listen<{ initial_completed: boolean }>('auth-complete', async (event) => {
      info('Auth completed from onboarding, redirecting');
      const { initial_completed } = event.payload;
      if (!initial_completed) await goto('/di');
      else await goto('/normal');
    }).then((unlisten) => {
      unlistenAuth = unlisten;
    });
  }

  onDestroy(() => {
    if (unlistenAuth) unlistenAuth();
  });

  async function saveAndContinue() {
    errorMessage = '';

    let trimmed = originUrl.trim();
    if (!trimmed) {
      errorMessage = 'Please enter the enduser origin URL.';
      return;
    }

    let url: URL;
    try {
      url = new URL(trimmed.endsWith('/') ? trimmed : trimmed + '/');
    } catch {
      errorMessage =
        'Invalid URL format. Please enter a valid URL (e.g. https://harvestsona.example.com).';
      return;
    }

    saving = true;

    try {
      await invoke('set_enduser_origin', { origin: url.origin });
      info(`Enduser origin saved: ${url.origin}. Starting authentication...`);

      registerAuthListener();
      authenticating = true;
      await invoke('begin_auth');
    } catch (e) {
      logError(`Failed to save enduser origin: ${e}`);
      errorMessage = `Failed to save: ${e}`;
      saving = false;
    }
  }
</script>

{#if authenticating}
  <div class="container">
    <h1>Authenticating...</h1>
    <p>A browser window should have opened. Please log in to continue.</p>
  </div>
{:else}
  <UrlInputCard
    bind:value={originUrl}
    bind:errorMessage
    bind:saving
    onsave={saveAndContinue}
    title="Welcome to Harvestsona Streamer"
    subtitle="Please enter the URL of your Harvestsona enduser instance to continue."
  />
{/if}

<style>
  .container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 2rem;
    box-sizing: border-box;
    font-family: system-ui, sans-serif;
    background: #1a1a2e;
    color: #eee;
    gap: 1rem;
  }

  h1 {
    margin: 0;
    font-size: 1.3rem;
    color: #fff;
  }

  p {
    font-size: 0.9rem;
    color: #888;
    text-align: center;
  }
</style>
