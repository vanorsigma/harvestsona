<script lang="ts">
  import { enhance } from '$app/forms';
  import { page } from '$app/state';
  import PageContainer from '$lib/components/PageContainer.svelte';
  import FileUploadPreview from '$lib/components/FileUploadPreview.svelte';
  import { MAX_HARVESTSONA_SIZE } from '@harvestsona/shared';
  import type { SubmitFunction } from './$types';

  let userList = $derived(page.data.userList ?? []);
  let selectedUsername = $state('');
  let selectedFile: File | null = $state(null);
  let uploading = $state(false);
  let errorMessage = $state('');
  let successMessage = $state('');
  let resetKey = $state(0);

  function onFileSelected(file: File) {
    selectedFile = file;
    errorMessage = '';
  }

  function onFileUnselected() {
    selectedFile = null;
  }

  function isUploadable() {
    return (
      selectedUsername &&
      selectedFile &&
      selectedFile.type.includes('image/') &&
      selectedFile.size < MAX_HARVESTSONA_SIZE
    );
  }

  const handleEnhance: SubmitFunction = () => {
    if (!isUploadable()) return;
    uploading = true;
    errorMessage = '';
    successMessage = '';

    return async ({ result, update }) => {
      await update();
      uploading = false;
      if (result.status?.toString().startsWith('4')) {
        errorMessage = 'Override failed. Please try again.';
      } else {
        successMessage = `Harvestsona updated for ${selectedUsername}.`;
        selectedUsername = '';
        selectedFile = null;
        resetKey++;
      }
    };
  };
</script>

<svelte:head>
  <title>Override Harvestsona</title>
</svelte:head>

<PageContainer>
  <h1>Override Harvestsona</h1>
  <p>
    Upload an image to immediately replace <em>any</em> user's current harvestsona. This bypasses the
    pending-approval queue.
  </p>

  <form method="POST" action="?/override" enctype="multipart/form-data" use:enhance={handleEnhance}>
    <div class="form-grid">
      <label class="field">
        <span>Target user</span>
        <select name="username" bind:value={selectedUsername} disabled={uploading}>
          <option value="">Select a user...</option>
          {#each userList as u}
            <option value={u.user.username}>{u.user.username}</option>
          {/each}
        </select>
      </label>

      <div class="field">
        <span>Image</span>
        {#key resetKey}
          <FileUploadPreview {onFileSelected} {onFileUnselected} />
        {/key}
      </div>
    </div>

    {#if errorMessage}
      <p class="error">{errorMessage}</p>
    {/if}

    {#if successMessage}
      <p class="success">{successMessage}</p>
    {/if}

    <button class="btn-green" type="submit" disabled={!isUploadable() || uploading}>
      {uploading ? 'Uploading...' : 'Override harvestsona'}
    </button>
  </form>
</PageContainer>

<style>
  h1 {
    margin: 0;
  }

  p {
    color: #888;
    font-size: 0.9rem;
    margin: 0;
  }

  em {
    font-style: italic;
    color: #999;
  }

  .form-grid {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    max-width: 500px;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .field span {
    font-size: 0.85rem;
    color: #888;
  }

  select {
    padding: 0.5rem 0.75rem;
    font-size: 0.95rem;
    border: 1px solid #444;
    border-radius: 6px;
    background: #12122a;
    color: #eee;
    font-family: system-ui, sans-serif;
    outline: none;
  }

  select:focus {
    border-color: #7c3aed;
    box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.15);
  }

  button {
    margin-top: 1rem;
    padding: 0.6rem 2rem;
    font-size: 0.95rem;
    font-weight: 500;
    border: none;
    border-radius: 6px;
    cursor: pointer;
  }

  button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .error {
    color: #f87171;
    font-size: 0.85rem;
    margin-top: 0.5rem;
  }

  .success {
    color: #4ade80;
    font-size: 0.85rem;
    margin-top: 0.5rem;
  }
</style>
