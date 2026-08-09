<script lang="ts">
  import { MAX_HARVESTSONA_SIZE } from '@harvestsona/shared';

  interface Props {
    fileInput: HTMLInputElement;
    onSelect: (file: File | null) => void;
  }

  let { fileInput, onSelect }: Props = $props();
  let dragging = $state(false);
  // let input: HTMLInputElement;

  let filename = $state('');

  function handleSelected(file: File | undefined | null) {
    if (!file) return;
    if (!file.type.includes('image/')) return;

    filename = file.name;
    onSelect(file);
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<div
  class:dragging
  class="dropzone"
  tabindex="0"
  role="button"
  onclick={() => fileInput?.click()}
  ondragover={(e) => {
    e.preventDefault();
    dragging = true;
  }}
  ondragleave={() => (dragging = false)}
  ondrop={(e) => {
    e.preventDefault();
    dragging = false;
    handleSelected(e.dataTransfer?.files?.[0]);
  }}
>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="outbox-icon"
  >
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>

  <div class="dropzone-texts">
    <p class="font-preschool dropzone-title">Drag and drop a file</p>
    <p class="font-preschool dropzone-subtitle">(or click here)</p>
    <p class="font-preschool dropzone-subtitle">Supported extensions: .png, .jpg, .gif, .webp</p>
    <p class="font-preschool dropzone-subtitle">
      Maximum file size: {MAX_HARVESTSONA_SIZE / 1_000_000}MB
    </p>
    {#if filename.length !== 0}
      <p class="font-preschool dropzone-subtitle">Selected file: <u><b>{filename}</b></u></p>
    {/if}
  </div>
</div>

<style>
  .dropzone {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;

    gap: 1rem;
    width: 100%;
    max-width: 400px;
    min-height: 200px;

    border: 2px dashed rgba(255, 255, 255, 0.2);
    border-radius: 20px;
    padding: 1.5rem;

    cursor: pointer;

    background-color: var(--bg);
    color: var(--red-1);

    transition: all 0.2s ease-in-out;
  }

  .dropzone:focus-visible {
    outline: 2px solid var(--red-1);
    outline-offset: 4px;
  }

  .dropzone:hover {
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.12);
  }

  .dropzone-texts p {
    margin: 0px;
    text-align: center;
  }

  .dropzone-title {
    font-size: 1.75rem;
  }

  .dropzone-subtitle {
    font-size: 0.9rem;
  }

  .outbox-icon {
    width: 48px;
    height: 48px;
    transition: transform 0.2s ease-in-out;
  }

  .dragging {
    background-color: var(--green-1);
    border-color: var(--green-3);
    color: white;
  }

  .dragging .outbox-icon {
    transform: translateY(-4px);
  }
</style>
