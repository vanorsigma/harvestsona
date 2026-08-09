<slot />

<style>
  :global(.container) {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100vh;
    padding: 2rem;
    font-family: system-ui, sans-serif;
  }

  :global(h1) {
    font-size: 1.4rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
    text-align: center;
  }

  :global(p) {
    font-size: 0.95rem;
    color: #666;
    margin: 1rem 0;
    text-align: center;
  }

  :global(.error) {
    color: #e74c3c;
  }

  :global(button) {
    margin-top: 1rem;
    padding: 0.5rem 1.5rem;
    font-size: 1rem;
    cursor: pointer;
  }

  :global(progress) {
    width: 80%;
    max-width: 400px;
    height: 1.5rem;
    border-radius: 4px;
  }
</style>
