<script lang="ts">
  import { onMount } from 'svelte';
  import { getCurrentWindow } from '@tauri-apps/api/window';
  import { load } from '@tauri-apps/plugin-store';
  import { emit, emitTo } from '@tauri-apps/api/event';
  import { invoke } from '@tauri-apps/api/core';
  import { info } from '@tauri-apps/plugin-log';
  import PushLocalChangesPanel from '$lib/components/PushLocalChangesPanel.svelte';

  let liveSync = $state(true);
  let showPush = $state(false);

  onMount(async () => {
    await getCurrentWindow().show();
    const store = await load('config.json');
    const stored = await store.get('live_sync');
    if (typeof stored === 'boolean') liveSync = stored;
  });

  async function toggleLiveSync() {
    const store = await load('config.json');
    await store.set('live_sync', liveSync);
    await store.save();
    info(`Live sync toggled to ${liveSync}`);
    await emit('live-sync-changed', liveSync);
  }

  async function startPush() {
    showPush = true;
  }

  async function onPushComplete() {
    showPush = false;
    liveSync = true;
    await toggleLiveSync();
    info('Invoking push_sync_completed via Rust...');
    await invoke('push_sync_completed');
    info('push_sync_completed Rust invoke done');
  }
</script>

<div class="container">
  {#if !showPush}
    <h1>Sync</h1>

    <label class="checkbox-row">
      <input type="checkbox" bind:checked={liveSync} onchange={toggleLiveSync} />
      <span>Live sync</span>
    </label>

    <button disabled={liveSync} onclick={startPush}> Push local changes </button>
  {:else}
    <PushLocalChangesPanel onComplete={onPushComplete} />
  {/if}
</div>

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
    gap: 1.25rem;
  }

  h1 {
    margin: 0;
    font-size: 1.3rem;
    color: #fff;
  }

  .checkbox-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.95rem;
    cursor: pointer;
  }

  .checkbox-row input[type='checkbox'] {
    width: 16px;
    height: 16px;
    accent-color: #7c3aed;
  }

  button {
    padding: 0.6rem 2rem;
    font-size: 0.95rem;
    font-weight: 500;
    border: none;
    border-radius: 6px;
    background: #7c3aed;
    color: #fff;
    cursor: pointer;
  }

  button:hover:not(:disabled) {
    background: #6d28d9;
  }

  button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
</style>
