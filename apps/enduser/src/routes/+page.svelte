<script>
  import Spinner from '$lib/components/Spinner.svelte';
</script>

<div class="loading-container">
  <div>Please wait, we are loading...</div>
  <Spinner></Spinner>
</div>

<style>
  .loading-container {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    justify-content: center;
  }

  .loading-container > div {
    text-align: center;
  }
</style>
