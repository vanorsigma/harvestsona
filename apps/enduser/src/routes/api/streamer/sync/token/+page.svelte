<script lang="ts">
  import { page } from '$app/state';
  import PageContainer from '$lib/components/PageContainer.svelte';

  let copied = $state(false);

  function copyToken() {
    navigator.clipboard.writeText(page.data.token);
    copied = true;
    setTimeout(() => (copied = false), 2000);
  }
</script>

<PageContainer>
  <h1>Login Token</h1>

  <p>It expires in 3 minutes.</p>

  <div class="token-display">
    <code>{page.data.token}</code>
  </div>

  <button class="btn btn-green" onclick={copyToken}>
    {copied ? 'Copied!' : 'Copy Token'}
  </button>
</PageContainer>

<style>
  .token-display {
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: var(--radius-md);
    padding: 1.25rem 1.5rem;
    overflow-x: auto;
    word-break: break-all;
  }

  .token-display code {
    font-family: 'Fot Yuruka', 'Courier New', monospace;
    font-size: 1.05rem;
    color: var(--green-1);
  }

  .btn {
    align-self: center;
    min-width: 180px;
  }
</style>
