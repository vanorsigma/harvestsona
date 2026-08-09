<div class="outer-container">
  <div class="inner-container">
    <img src="/melon.png" alt="Currently loading..." />
  </div>
</div>

<style>
  @keyframes continuous-spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  .outer-container {
    display: flex;
    width: 100%;
    justify-content: center;
  }

  .outer-container > div {
    width: 4em;
  }

  .outer-container > div > img {
    width: 100%;
    animation: continuous-spin 2s linear infinite;
  }
</style>
