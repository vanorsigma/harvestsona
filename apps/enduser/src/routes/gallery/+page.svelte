<script lang="ts">
  import PageContainer from '$lib/components/PageContainer.svelte';
  import GalleryCard from '$lib/components/GalleryCard.svelte';
  import type { Harvestsona } from '@harvestsona/shared';
  import { page } from '$app/state';
  import JumpToProfile from '$lib/components/JumpToProfile.svelte';
  import SpinnerContainer from '$lib/components/SpinnerContainer.svelte';

  let query = $state(page.url.searchParams.get('q') ?? '');
  let loadedHarvestsonas = $state(page.data.harvestsonas);
  let nextOffset = $state(page.data.harvestsonas.length);
  let isLoadingMore = $state(false);
  let hasMore = $state(page.data.continuation !== null);

  $effect(() => {
    query = page.url.searchParams.get('q') ?? '';
    loadedHarvestsonas = page.data.harvestsonas;
    nextOffset = page.data.continuation ?? page.data.harvestsonas.length;
    hasMore = page.data.continuation !== null;
  });

  async function onLoadMorePress() {
    if (isLoadingMore || !hasMore || nextOffset === null) return;
    isLoadingMore = true;
    const nextHarvestsonasResp = await fetch(
      `/api/harvestsonas?q=${encodeURIComponent(query)}&offset=${nextOffset}`,
      {
        headers: { accept: 'application/json' }
      }
    );

    isLoadingMore = false;
    const nextHarvestsonas = (await nextHarvestsonasResp.json()) as {
      harvestsonas: Harvestsona[];
      continuation: number | null;
    };
    loadedHarvestsonas = [...loadedHarvestsonas, ...nextHarvestsonas.harvestsonas];
    nextOffset = nextHarvestsonas.continuation;
    hasMore = nextHarvestsonas.continuation !== null;
  }
</script>

<svelte:head>
  <title>Gallery</title>
</svelte:head>

<PageContainer>
  <h1>Gallery</h1>
  <div class="jump-to-profile">
    {#if page.data.user}
      <JumpToProfile username={page.data.user.name} avatarUrl={page.data.user.image}
      ></JumpToProfile>
    {/if}
  </div>

  <form class="gallery-search" method="GET" action={page.url.pathname}>
    <label for="gallery-search">Search username</label>

    <div class="search-row">
      <input
        id="gallery-search"
        name="q"
        type="search"
        placeholder="Search harvestsonas..."
        bind:value={query}
        autocomplete="off"
        spellcheck="false"
      />

      <button type="submit" class="btn btn-green">Search</button>
      {#if query}
        <a class="btn btn-red clear-btn" href={page.url.pathname}>Clear</a>
      {/if}
    </div>
  </form>

  <div class="gallery-grid">
    {#each loadedHarvestsonas as harvestsona}
      {#if harvestsona.harvestsonaImage}
        <GalleryCard
          username={harvestsona.user.username}
          imageUrl={`/api/harvestsonas/${harvestsona.harvestsonaImage}`}
        ></GalleryCard>
      {/if}
    {/each}

    {#if loadedHarvestsonas.filter((hs: Harvestsona) => hs.harvestsonaImage).length === 0}
      <p>No one has any Harvestsona Images just yet...</p>
    {/if}
  </div>

  <div class="gallery-footer">
    {#if hasMore}
      <SpinnerContainer enabled={isLoadingMore}>
        <button type="button" class="btn btn-green load-more-btn" onclick={onLoadMorePress}>
          Load more
        </button>
      </SpinnerContainer>
    {/if}
  </div>
</PageContainer>

<style>
  h1 {
    text-align: center;
  }

  .jump-to-profile {
    position: absolute;
    top: 1rem;
    right: 1rem;
  }

  .gallery-search {
    max-width: 720px;
    margin: 0 auto 1.5rem;
  }

  .search-row {
    display: flex;
    gap: 0.75rem;
    align-items: stretch;
  }

  .search-row input {
    flex: 1 1 240px;
  }

  .clear-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    text-decoration: none;
  }

  .gallery-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 1.5rem;
    width: 100%;
    justify-items: center;
    align-items: start;
  }

  @media (max-width: 768px) {
    :global(.page) {
      padding: 1rem 0.75rem;
    }

    :global(.card) {
      max-width: 100vw;
      padding: 1rem;
    }

    .jump-to-profile {
      display: none;
    }

    .search-row {
      flex-direction: column;
    }

    .search-row input {
      flex: none;
      width: 100%;
    }

    .search-row button,
    .search-row .clear-btn {
      width: 100%;
    }

    .gallery-grid {
      grid-template-columns: repeat(2, 1fr);
      gap: 1rem;
    }
  }

  @media (max-width: 480px) {
    .gallery-grid {
      grid-template-columns: 1fr;
    }
  }

  .gallery-footer {
    display: flex;
    justify-content: center;
    padding-top: 0.5rem;
  }

  .load-more-btn {
    min-width: 180px;
  }
</style>
