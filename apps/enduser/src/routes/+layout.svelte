<script lang="ts">
  import NavBar from '$lib/components/NavBar.svelte';

  let { children } = $props();
</script>

<svelte:head>
  <link rel="icon" href={'/favicon.ico'} />
  <title>Harvestsona</title>
</svelte:head>

<NavBar />
{@render children()}
