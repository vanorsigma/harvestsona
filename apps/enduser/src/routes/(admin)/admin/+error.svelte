<script lang="ts">
  import { page } from '$app/state';
  import GenericError from '$lib/components/GenericError.svelte';
</script>

{#if page.status === 403}
  <div class="error-container">
    <h1>You are not allowed to access this resource.</h1>
    <p>i.e. u r stinky xdx</p>
  </div>
{:else}
  <GenericError />
{/if}
