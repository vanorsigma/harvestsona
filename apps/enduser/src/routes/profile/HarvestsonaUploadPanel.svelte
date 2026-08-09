<script lang="ts">
  import { enhance } from '$app/forms';
  import FileUploadPreview from '$lib/components/FileUploadPreview.svelte';
  import SpinnerContainer from '$lib/components/SpinnerContainer.svelte';
  import type { SubmitFunction } from './$types';
  import HarvestsonaPreview from './HarvestsonaPreview.svelte';
  import { MAX_HARVESTSONA_SIZE } from '@harvestsona/shared';

  let { username, pendingURL } = $props<{
    username: string;
    pendingURL: string | null;
  }>();

  let selectedFile: File | null = $state(null);
  let uploadCancellableURL = $state('');
  let uploading = $state(false);
  let isEditingPending = $state(false);

  function onFileSelectedCallback(file: File) {
    selectedFile = file;
  }

  function onFileUnselectedCallback() {
    selectedFile = null;
  }

  function editPendingBtnClick() {
    isEditingPending = true;
    uploadCancellableURL = pendingURL;
  }

  function cancelBtnClick() {
    isEditingPending = false;
    uploadCancellableURL = '';
  }

  function isUploadable() {
    return (
      selectedFile &&
      selectedFile.type.includes('image/') &&
      selectedFile.size < MAX_HARVESTSONA_SIZE
    );
  }

  const handleEnhance: SubmitFunction = () => {
    if (!isUploadable()) return;
    uploading = true;

    return async ({ result, update }) => {
      await update();
      uploading = false;
      if (result.status?.toString().startsWith('2')) isEditingPending = false;
    };
  };
</script>

<div class="harvestsona-section floating-edit">
  {#if pendingURL && !isEditingPending}
    <HarvestsonaPreview
      harvestsonaURL={pendingURL}
      title={'Harvestsona Pending Approval'}
      alttext={`${username} pending harvestsona`}
    ></HarvestsonaPreview>
    <button class="btn-red btn-edit" onclick={editPendingBtnClick}>🖊 Edit Pending</button>
  {:else}
    <div class="section-header">
      <h2>Upload a new Harvestsona...</h2>
    </div>
    <SpinnerContainer enabled={uploading}>
      <div class="upload-section">
        <form method="POST" enctype="multipart/form-data" use:enhance={handleEnhance}>
          <FileUploadPreview
            onFileSelected={onFileSelectedCallback}
            onFileUnselected={onFileUnselectedCallback}
          ></FileUploadPreview>
          <button class="btn-green" disabled={!isUploadable()} type="submit">Upload</button>
          <button
            class="btn-red"
            onclick={cancelBtnClick}
            type="button"
            disabled={uploadCancellableURL.length === 0}>Cancel</button
          >
        </form>
      </div>
    </SpinnerContainer>
  {/if}
</div>

<style>
  .floating-edit {
    position: relative;
  }

  .btn-edit {
    position: absolute;
    top: 2rem;
    right: 0.33rem;
    z-index: 2;
    padding: 0.35rem 0.6rem;
    font-size: 0.8rem;
    border-radius: 999px;
    opacity: 0.5;
  }

  .btn-edit:hover {
    opacity: 1;
  }

  .upload-section * {
    margin-top: 0.5rem;
    margin-bottom: 0.5rem;
  }

  @media (max-width: 640px) {
    .btn-edit {
      position: static;
      opacity: 1;
    }
  }
</style>
