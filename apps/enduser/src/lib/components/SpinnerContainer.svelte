<script lang="ts">
  import Spinner from './Spinner.svelte';
  let { enabled, children } = $props();
</script>

{#if enabled}
  <Spinner></Spinner>
{:else}
  {@render children?.()}
{/if}
