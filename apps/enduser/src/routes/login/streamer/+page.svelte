<script lang="ts">
  import { signIn } from '$lib/client/auth-client';
  import LoginWithTwitchButton from '$lib/components/LoginWithTwitchButton.svelte';
  import PageContainer from '$lib/components/PageContainer.svelte';
</script>

<PageContainer>
  <div class="login-section">
    <h1>HarvestSona requires you to sign in to Twitch to continue.</h1>
    <LoginWithTwitchButton width={200} onclick={signIn}></LoginWithTwitchButton>
  </div>

  <div class="divider">
    <span>or</span>
  </div>

  <form method="POST" action="?/codelogin">
    <h2>Use a login code</h2>
    <p>If you already have a one-time login token from the streamer panel, enter it below.</p>
    <input name="code" placeholder="Paste your login code here..." />
    <button class="btn btn-green">Login</button>
  </form>
</PageContainer>

<style>
  .login-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  .login-section h1 {
    text-align: center;
  }

  .divider {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    width: 100%;
    max-width: 320px;
    margin: 0 auto;
  }

  .divider::before,
  .divider::after {
    content: '';
    flex: 1;
    height: 1px;
    background: rgba(255, 255, 255, 0.2);
  }

  .divider span {
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    opacity: 0.6;
  }

  form {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    max-width: 400px;
    margin: 0 auto;
    width: 100%;
  }

  form h2 {
    margin: 0;
    font-size: 1.25rem;
  }

  form p {
    margin: 0;
    text-align: center;
    font-size: 0.95rem;
  }
</style>
