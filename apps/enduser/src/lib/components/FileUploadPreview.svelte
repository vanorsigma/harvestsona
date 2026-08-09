<script lang="ts">
  import ImageDropzone from './ImageDropzone.svelte';

  let { onFileSelected, onFileUnselected } = $props<{
    onFileSelected: (file: File) => void;
    onFileUnselected: () => void;
  }>();
  let fileInput: HTMLInputElement | null = $state(null);
  let imageSrc: string = $state('');

  function onDropzoneSelect(file: File | undefined | null) {
    if (!file) return;

    if (imageSrc) URL.revokeObjectURL(imageSrc);
    imageSrc = URL.createObjectURL(file);

    if (fileInput) {
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      fileInput.files = dataTransfer.files;
    }

    onFileSelected(file);
  }

  function onCancelPressed() {
    URL.revokeObjectURL(imageSrc);
    imageSrc = '';
    onFileUnselected();
  }

  // general destructor
  $effect(() => {
    return () => {
      if (imageSrc) URL.revokeObjectURL(imageSrc);
    };
  });
</script>

<input
  name="file"
  bind:this={fileInput}
  hidden
  type="file"
  accept="image/*"
  required
  onchange={(e) => onDropzoneSelect((e.currentTarget as HTMLInputElement).files?.[0] ?? null)}
/>
{#if imageSrc}
  <div class="image-preview">
    <img src={imageSrc} alt="User uploaded HarvestSona" />
  </div>
  <button class="btn-red" onclick={onCancelPressed}>Cancel Selection</button>
{:else}
  <ImageDropzone {fileInput} onSelect={onDropzoneSelect}></ImageDropzone>
{/if}

<style>
  .image-preview {
    display: flex;
    justify-content: center;
    align-items: center;

    max-width: 100%;
    max-height: 400px;

    margin-bottom: 1.5rem;
    padding: 0.5rem;
    border: 1px solid #e2e8f0;
    border-radius: 0.75rem;
    background-color: #f8fafc;
    box-shadow:
      0 4px 6px -1px rgba(0, 0, 0, 0.1),
      0 2px 4px -1px rgba(0, 0, 0, 0.06);
    overflow: hidden;
  }

  .image-preview img {
    max-width: 320px;
    max-height: 100%;
    object-fit: contain;
    border-radius: 0.5rem;
    display: block;
  }
</style>
