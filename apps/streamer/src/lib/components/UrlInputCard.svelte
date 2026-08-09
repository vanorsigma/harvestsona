<script lang="ts">
  let {
    value = $bindable(''),
    errorMessage = $bindable(''),
    saving = $bindable(false),
    onsave,
    title = 'Configure URL',
    subtitle = '',
    placeholder = 'https://harvestsona.example.com',
    buttonLabel = 'Continue'
  }: {
    value?: string;
    errorMessage?: string;
    saving?: boolean;
    onsave?: () => Promise<void>;
    title?: string;
    subtitle?: string;
    placeholder?: string;
    buttonLabel?: string;
  } = $props();
</script>

<div class="container">
  <h1>{title}</h1>
  {#if subtitle}
    <p>{subtitle}</p>
  {/if}

  <form onsubmit={onsave} class="form">
    <input type="url" bind:value {placeholder} disabled={saving} class="input" />
    {#if errorMessage}
      <p class="error">{errorMessage}</p>
    {/if}
    <button type="submit" disabled={saving}>
      {saving ? 'Saving...' : buttonLabel}
    </button>
  </form>
</div>

<style>
  .container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 2rem;
    box-sizing: border-box;
    font-family: system-ui, sans-serif;
    background: #1a1a2e;
    color: #eee;
  }

  h1 {
    margin: 0 0 0.5rem;
    font-size: 1.4rem;
    color: #fff;
  }

  p {
    margin: 0 0 1.25rem;
    font-size: 0.9rem;
    color: #bbb;
    text-align: center;
    max-width: 400px;
  }

  .form {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    width: 100%;
    max-width: 400px;
  }

  .input {
    width: 100%;
    padding: 0.6rem 0.75rem;
    font-size: 0.95rem;
    border: 1px solid #444;
    border-radius: 6px;
    outline: none;
    background: #12122a;
    color: #eee;
    font-family: system-ui, sans-serif;
  }

  .input:focus {
    border-color: #7c3aed;
    box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.15);
  }

  button {
    margin-top: 0;
    padding: 0.6rem 2rem;
    font-size: 0.95rem;
    font-weight: 500;
    border: none;
    border-radius: 6px;
    background: #7c3aed;
    color: #fff;
    cursor: pointer;
  }

  button:hover:not(:disabled) {
    background: #6d28d9;
  }

  button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .error {
    color: #f87171;
    font-size: 0.85rem;
    margin: 0;
  }
</style>
