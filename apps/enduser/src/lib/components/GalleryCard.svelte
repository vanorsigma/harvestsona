<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    username,
    imageUrl,
    square = true,
    badgeUrl = null,
    children
  }: {
    username: string;
    imageUrl: string;
    square?: boolean;
    badgeUrl?: string | null;
    children?: Snippet;
  } = $props();
</script>

<div class="card-wrap">
  <div class="card" class:square>
    <div class="image-frame">
      <img src={imageUrl} alt={`${username}'s harvestsona`} />
      {#if badgeUrl}
        <img class="badge" src={badgeUrl} alt="" />
      {/if}
    </div>
    <span class="username">{username}</span>
    {@render children?.()}
  </div>
</div>

<style>
  .card-wrap {
    width: 100%;
    min-width: 0;
  }

  .card {
    container-type: inline-size;
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    padding: 1rem;
    border-radius: 1.5rem;
    background: rgba(255, 255, 255, 0.12);
    border: 1px solid rgba(255, 255, 255, 0.22);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
    backdrop-filter: blur(16px) saturate(180%);
    user-select: none;
    overflow: hidden;
  }

  .card.square {
    aspect-ratio: 1 / 1;
  }

  .image-frame {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 0;
    position: relative;
  }

  .image-frame > img:first-child {
    width: 100%;
    height: 100%;
    object-fit: contain;
    display: block;
  }

  .badge {
    position: absolute;
    right: -4px;
    bottom: -4px;
    width: clamp(28px, 10cqi, 48px);
    height: clamp(28px, 10cqi, 48px);
    border-radius: 999px;
    object-fit: cover;
    border: 2px solid rgba(255, 255, 255, 0.9);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
    background: rgba(255, 255, 255, 0.08);
  }

  .username {
    display: block;
    margin: 0.5rem 0 0;
    text-align: center;
    font-weight: 700;
    font-size: clamp(0.6rem, 7cqi, 1.5rem);
    line-height: 1.2;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .card:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.24);
    transition: all 240ms cubic-bezier(0.22, 1, 0.36, 1);
  }
</style>
