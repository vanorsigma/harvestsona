<script lang="ts">
  import { onMount } from 'svelte';
  import { getCurrentWindow } from '@tauri-apps/api/window';
  import { load } from '@tauri-apps/plugin-store';
  import { emit } from '@tauri-apps/api/event';
  import { invoke } from '@tauri-apps/api/core';
  import { error as logError, info } from '@tauri-apps/plugin-log';
  import UrlInputCard from '$lib/components/UrlInputCard.svelte';

  let originUrl = $state('');
  let errorMessage = $state('');
  let saving = $state(false);

  onMount(async () => {
    await getCurrentWindow().show();
    const store = await load('config.json');
    const stored = await store.get('enduser_origin');
    if (typeof stored === 'string') originUrl = stored;
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
      info(`Enduser origin updated: ${url.origin}`);

      await invoke('clear_cookies');
      await emit('host-url-changed', url.origin);

      await getCurrentWindow().close();
    } catch (e) {
      logError(`Failed to save enduser origin: ${e}`);
      errorMessage = `Failed to save: ${e}`;
      saving = false;
    }
  }
</script>

<UrlInputCard
  bind:value={originUrl}
  bind:errorMessage
  bind:saving
  onsave={saveAndContinue}
  title="Update host URL"
  subtitle="Enter the URL of your Harvestsona enduser instance."
/>
