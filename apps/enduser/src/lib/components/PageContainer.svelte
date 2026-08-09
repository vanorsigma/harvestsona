<script lang="ts">
  import type { Snippet } from 'svelte';

  let { children }: { children?: Snippet } = $props();
</script>

<div class="page">
  <div class="card">
    {@render children?.()}
  </div>
</div>

<style>
  .page {
    min-height: 100vh;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    padding: 3rem 1.5rem;
    box-sizing: border-box;
  }

  .card {
    width: 100%;
    max-width: 80vw;
    padding: 2rem;
    border-radius: 28px;
    backdrop-filter: blur(12px);
    display: flex;
    flex-direction: column;
    gap: 2rem;

    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow:
      0 10px 40px rgba(0, 0, 0, 0.25),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
  }
</style>
