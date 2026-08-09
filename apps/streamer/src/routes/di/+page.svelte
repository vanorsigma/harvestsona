<script lang="ts">
  import { goto } from '$app/navigation';
  import { load } from '@tauri-apps/plugin-store';
  import { getCurrentWindow } from '@tauri-apps/api/window';
  import { info } from '@tauri-apps/plugin-log';
  import { onMount } from 'svelte';
  import PushLocalChangesPanel from '$lib/components/PushLocalChangesPanel.svelte';

  let showPanel = $state(false);

  onMount(async () => {
    info('Push local changes page mounted');
    await getCurrentWindow().show();
  });

  async function onComplete() {
    const store = await load('config.json');
    await store.set('initial_completed', true);
    await store.save();
    info('Push local changes finished, redirecting to /normal');
    goto('/normal');
  }

  async function onCancel() {
    const store = await load('config.json');
    await store.set('initial_completed', true);
    await store.save();
    goto('/normal');
  }
</script>

{#if showPanel}
  <PushLocalChangesPanel {onComplete} {onCancel} />
{:else}
  <div class="container">
    <h1>Initial Sync</h1>
    <p>Push your local harvestsona images to the server, or skip for now.</p>
    <p class="desc">Even if you do not perform a push sync now, you can choose to do it later.</p>
    <div class="buttons">
      <button class="btn-primary" onclick={() => (showPanel = true)}>
        Choose folder for a push sync
      </button>
      <button class="btn-secondary" onclick={onCancel}> I will sync later </button>
    </div>
  </div>
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
    font-size: 1.5rem;
    color: #fff;
  }

  p {
    font-size: 0.95rem;
    color: #888;
    text-align: center;
    margin: 0;
    max-width: 360px;
  }

  .desc {
    font-size: 0.85rem;
    color: #777;
    margin-bottom: 1rem;
  }

  .buttons {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-top: 1rem;
  }

  button {
    padding: 0.6rem 2rem;
    font-size: 0.95rem;
    font-weight: 500;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    min-width: 280px;
  }

  .btn-primary {
    background: #7c3aed;
    color: #fff;
  }

  .btn-primary:hover {
    background: #6d28d9;
  }

  .btn-secondary {
    background: rgba(255, 255, 255, 0.1);
    color: #ccc;
    border: 1px solid rgba(255, 255, 255, 0.15);
  }

  .btn-secondary:hover {
    background: rgba(255, 255, 255, 0.15);
  }
</style>
