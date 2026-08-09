<script lang="ts">
  import { page } from '$app/state';
  import PageContainer from '$lib/components/PageContainer.svelte';
  import HarvestsonaPreview from './HarvestsonaPreview.svelte';
  import HarvestsonaUploadPanel from './HarvestsonaUploadPanel.svelte';

  let username = $derived(page.data.user?.name ?? '<<stinky>>');
  let imageURL = $derived(page.data.user?.image ?? '');
  let serverHarvestsonaFilename = $derived(page.data.currentFilename);
  let harvestsonaURL = $derived(
    serverHarvestsonaFilename ? `/api/harvestsonas/${serverHarvestsonaFilename}` : null
  );
  let pendingHarvestsonaURL = $derived(
    page.data.pendingFilename ? `/api/harvestsonas/${page.data.pendingFilename}` : null
  );
</script>

<svelte:head>
  <title>Profile</title>
</svelte:head>

<PageContainer>
  <div class="profile-header">
    <img class="profile-photo" src={imageURL} alt={`${username} profile photo`} />
    <div class="profile-info">
      <p class="profile-label">Twitch Username</p>
      <h1 class="profile-name">{username}</h1>
    </div>
  </div>

  <div class="harvestsona" class:no-current={!harvestsonaURL}>
    {#if harvestsonaURL}
      <HarvestsonaPreview
        {harvestsonaURL}
        title={'Current Harvestsona'}
        alttext={`${username} harvestsona`}
      ></HarvestsonaPreview>

      <svg
        class="direction-arrow"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width="128"
        height="128"
        fill="#888888"
      >
        <path d="M5 9h8V5l7 7-7 7v-4H5z" />
      </svg>
    {/if}

    <HarvestsonaUploadPanel {username} pendingURL={pendingHarvestsonaURL}></HarvestsonaUploadPanel>
  </div>
</PageContainer>

<style>
  .profile-header {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    flex-wrap: wrap;
  }

  .profile-photo {
    width: 120px;
    height: 120px;
    border-radius: 999px;
    object-fit: cover;
    border: 4px solid rgba(255, 255, 255, 0.2);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.25);
    flex-shrink: 0;
  }

  .profile-info {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .profile-label {
    margin: 0;
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    opacity: 0.7;
  }

  .profile-name {
    margin: 0;
    font-size: clamp(2rem, 5vw, 3rem);
    line-height: 1;
  }

  :global(.section-header) {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
  }

  :global(.section-header h2) {
    margin: 0;
    font-size: 1.25rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  :global(.harvestsona-section) {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    min-width: 0;
  }

  .harvestsona {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    gap: 1.5rem;
  }

  .no-current {
    max-width: 320px;
    margin-inline: auto;

    flex: 0 1 auto;
  }

  .direction-arrow {
    flex-shrink: 0;
    transition: transform 0.3s ease;
  }

  @media (max-width: 640px) {
    .profile-header {
      flex-direction: column;
      align-items: flex-start;
    }

    .profile-photo {
      width: 96px;
      height: 96px;
    }

    .harvestsona {
      flex-direction: column;
      align-items: center;
      gap: 2rem;
    }

    :global(.harvestsona-section) {
      width: 100%;
      max-width: 400px;
    }

    .direction-arrow {
      transform: rotate(90deg);
      height: 48px;
      width: 48px;
    }
  }
</style>
