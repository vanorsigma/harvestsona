<script lang="ts">
  import {
    selectDirectory,
    collectUploadEntriesFromDirectory,
    runInitialSync,
    type UploadEntry,
    type ProgressUpdate
  } from '$lib/initial/index.js';
  import {
    loadPendingSyncEntries,
    savePendingSyncEntries,
    clearPendingSyncEntries
  } from '$lib/initial/cache.js';
  import { error as logError, info } from '@tauri-apps/plugin-log';
  import { onMount } from 'svelte';

  type PageState =
    | 'loading'
    | 'selecting'
    | 'scanning'
    | 'uploading'
    | 'complete'
    | 'error'
    | 'resuming';

  let {
    onComplete,
    onCancel
  }: {
    onComplete?: () => void;
    onCancel?: () => void;
  } = $props();

  let pageState: PageState = $state('loading');
  let errorMessage: string = $state('');
  let uploadProgress: { current: number; total: number } = $state({ current: 0, total: 0 });
  let entries: UploadEntry[] = $state([]);

  async function startFlow() {
    info('PushLocalChanges: starting flow...');
    pageState = 'loading';

    try {
      const cached = await loadPendingSyncEntries();
      if (cached && cached.length > 0) {
        info(`Found ${cached.length} cached pending upload entries, resuming`);
        entries = cached;
        pageState = 'resuming';
        await beginUpload();
        return;
      }

      info('No cached entries found, prompting for directory');
      await promptDirectory();
    } catch (e) {
      pageState = 'error';
      errorMessage = `Failed to start push: ${e}`;
      logError(`startFlow failed: ${e}`);
    }
  }

  async function promptDirectory() {
    info('Prompting user to select a directory');
    pageState = 'selecting';
    const dirPath = await selectDirectory();
    if (!dirPath) {
      info('User cancelled directory selection');
      await clearPendingSyncEntries();
      onCancel?.();
      return;
    }

    pageState = 'scanning';
    info(`Scanning directory: ${dirPath}`);
    try {
      entries = await collectUploadEntriesFromDirectory(dirPath);
    } catch (e) {
      pageState = 'error';
      errorMessage = `Failed to scan directory: ${e}`;
      logError(`Directory scan failed: ${e}`);
      return;
    }

    info(`Scan found ${entries.length} image(s)`);

    if (entries.length === 0) {
      pageState = 'error';
      errorMessage = 'No images found in the selected directory.';
      logError('No images found in the selected directory');
      return;
    }

    await savePendingSyncEntries(entries);
    await beginUpload();
  }

  async function beginUpload() {
    info(`Beginning upload of ${entries.length} entries`);
    pageState = 'uploading';
    uploadProgress = { current: 0, total: entries.length };

    try {
      await runInitialSync(entries, (update: ProgressUpdate) => {
        const currentEntry = entries[uploadProgress.current];
        info(
          `Upload progress: ${update.progress}/${entries.length} (just completed: ${currentEntry?.username ?? 'unknown'})`
        );
        uploadProgress = { current: update.progress, total: entries.length };
      });
    } catch (e) {
      pageState = 'error';
      errorMessage = `Upload failed: ${e}`;
      logError(`Upload failed at progress ${uploadProgress.current}/${entries.length}: ${e}`);
      return;
    }

    info(`Upload complete. ${uploadProgress.current}/${entries.length} files synced.`);
    pageState = 'complete';

    await clearPendingSyncEntries();
    info('Push local changes finished');
    onComplete?.();
  }

  async function tryAgain() {
    info('User retrying push');
    await clearPendingSyncEntries();
    entries = [];
    await promptDirectory();
  }

  async function cancelUpload() {
    info('User cancelled push');
    await clearPendingSyncEntries();
    onCancel?.();
  }

  onMount(() => {
    startFlow();
  });
</script>

<div class="container">
  {#if pageState === 'loading'}
    <p>Checking for previous sync state...</p>
  {:else if pageState === 'selecting'}
    <p>Please select the folder containing your harvestsona images.</p>
  {:else if pageState === 'scanning'}
    <p>Scanning directory for images...</p>
  {:else if pageState === 'resuming'}
    <p>Resuming previous push...</p>
  {:else if pageState === 'uploading'}
    <p>
      Uploading {Math.min(uploadProgress.current + 1, uploadProgress.total)} of {uploadProgress.total}:
      {entries[uploadProgress.current]?.username ?? ''}...
    </p>
    <progress value={uploadProgress.current} max={uploadProgress.total}></progress>
    <button onclick={cancelUpload}>Cancel</button>
  {:else if pageState === 'complete'}
    <p>Push complete!</p>
    <progress value={uploadProgress.total} max={uploadProgress.total}></progress>
  {:else if pageState === 'error'}
    <p class="error">{errorMessage}</p>
    <button onclick={tryAgain}>Try Again</button>
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
    gap: 1rem;
  }

  p {
    font-size: 0.95rem;
    color: #ccc;
    text-align: center;
  }

  progress {
    width: 100%;
    max-width: 300px;
    height: 8px;
    border-radius: 4px;
    overflow: hidden;
  }

  progress::-webkit-progress-bar {
    background: #2a2a4a;
    border-radius: 4px;
  }

  progress::-webkit-progress-value {
    background: #7c3aed;
    border-radius: 4px;
  }

  button {
    padding: 0.5rem 1.5rem;
    font-size: 0.9rem;
    font-weight: 500;
    border: none;
    border-radius: 6px;
    background: #7c3aed;
    color: #fff;
    cursor: pointer;
  }

  button:hover {
    background: #6d28d9;
  }

  .error {
    color: #f87171;
  }
</style>
