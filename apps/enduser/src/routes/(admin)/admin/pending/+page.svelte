<script lang="ts">
  import { enhance } from '$app/forms';
  import { page } from '$app/state';
  import { SvelteSet } from 'svelte/reactivity';
  import PageContainer from '$lib/components/PageContainer.svelte';
  import GalleryCard from '$lib/components/GalleryCard.svelte';

  let selectedUids = $state(new SvelteSet<string>());
  let pending = $derived(page.data.pending ?? []);

  function toggleUid(uid: string) {
    if (selectedUids.has(uid)) {
      selectedUids.delete(uid);
    } else {
      selectedUids.add(uid);
    }
  }

  function selectAll() {
    for (const p of pending) {
      selectedUids.add(p.user.uid);
    }
  }

  function deselectAll() {
    selectedUids.clear();
  }
</script>

<svelte:head>
  <title>Pending Approvals</title>
</svelte:head>

<PageContainer>
  <h1>Pending Approvals</h1>
  <p class="override-link"><a href="/admin/override">Override a user's harvestsona</a></p>

  {#if pending.length === 0}
    <p>No pending approvals.</p>
  {:else}
    <div class="bulk-bar">
      <button type="button" class="btn btn-sm" onclick={selectAll}>Select All</button>
      <button type="button" class="btn btn-sm" onclick={deselectAll}>Deselect All</button>

      <span class="bulk-spacer"></span>

      <form method="POST" action="?/approve" use:enhance>
        {#each [...selectedUids] as uid}
          <input type="hidden" name="uid" value={uid} />
        {/each}
        <button type="submit" class="btn-green btn-sm" disabled={selectedUids.size === 0}>
          Approve Selected ({selectedUids.size})
        </button>
      </form>

      <form method="POST" action="?/deny" use:enhance>
        {#each [...selectedUids] as uid}
          <input type="hidden" name="uid" value={uid} />
        {/each}
        <button type="submit" class="btn-red btn-sm" disabled={selectedUids.size === 0}>
          Deny Selected ({selectedUids.size})
        </button>
      </form>
    </div>

    <div class="gallery-grid">
      {#each pending as approval}
        <div class="card-wrap">
          <label class="checkbox-overlay">
            <input
              type="checkbox"
              checked={selectedUids.has(approval.user.uid)}
              onchange={() => toggleUid(approval.user.uid)}
            />
          </label>

          <GalleryCard
            square={false}
            username={approval.user.username}
            imageUrl={`/api/harvestsonas/${approval.pendingFilename}`}
            badgeUrl={approval.currentFilename
              ? `/api/harvestsonas/${approval.currentFilename}`
              : null}
          >
            <div class="card-actions">
              <form method="POST" action="?/approve" use:enhance>
                <input type="hidden" name="uid" value={approval.user.uid} />
                <button type="submit" class="btn-green btn-sm">Approve</button>
              </form>
              <form method="POST" action="?/deny" use:enhance>
                <input type="hidden" name="uid" value={approval.user.uid} />
                <button type="submit" class="btn-red btn-sm">Deny</button>
              </form>
            </div>
          </GalleryCard>
        </div>
      {/each}
    </div>
  {/if}
</PageContainer>

<style>
  .bulk-bar {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
    margin-bottom: 1.5rem;
  }

  .bulk-bar form {
    display: contents;
  }

  .bulk-spacer {
    flex: 1;
  }

  .override-link {
    margin-top: -1rem;
    margin-bottom: 0;
  }

  .override-link a {
    color: #a78bfa;
    font-size: 0.85rem;
  }

  .gallery-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 1.5rem;
    width: 100%;
    justify-items: center;
    justify-content: center;
  }

  .card-wrap {
    position: relative;
    width: 100%;
    max-width: 320px;
  }

  .checkbox-overlay {
    position: absolute;
    top: 0.5rem;
    left: 0.5rem;
    z-index: 2;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.85);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    cursor: pointer;
  }

  .checkbox-overlay input[type='checkbox'] {
    width: 16px;
    height: 16px;
    margin: 0;
    cursor: pointer;
    accent-color: var(--green-3, #78c26d);
  }

  .card-actions {
    display: flex;
    gap: 0.5rem;
    justify-content: center;
    margin-top: 0.5rem;
  }

  .card-actions form {
    display: contents;
  }

  .btn-sm:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    transform: none !important;
  }
</style>
