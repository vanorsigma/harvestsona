<script>
  import { signIn } from '$lib/client/auth-client';
  import LoginWithTwitchButton from '$lib/components/LoginWithTwitchButton.svelte';
</script>

<div>
  <h1>HarvestSona requires you to sign in to Twitch to continue.</h1>
  <LoginWithTwitchButton width={200} onclick={signIn}></LoginWithTwitchButton>
</div>

<style>
  div {
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
</style>
