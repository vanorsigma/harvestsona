<script lang="ts">
  import type { HarvestsonaImageURL } from '@harvestsona/shared';

  let {
    username,
    avatarUrl,
    harvestsonaUrl = null
  } = $props<{
    username: string;
    avatarUrl: string;
    harvestsonaUrl?: HarvestsonaImageURL | null;
  }>();
</script>

<aside class="jump-card">
  <a class="jump-link" href={'/profile'} aria-label={`Jump to ${username}'s profile'`}>
    <div class="jump-header">
      <div class="avatar-wrap">
        <img class="avatar" src={avatarUrl} alt={`${username} Twitch avatar`} />
        {#if harvestsonaUrl}
          <img
            class="harvestsona-badge"
            src={harvestsonaUrl}
            alt={`${username} current harvestsona`}
          />
        {/if}
      </div>
      <div class="user-meta">
        <p class="label">Jump to Profile</p>
        <h2 class="username">{username}</h2>
      </div>

      <svg
        class="arrow"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width="28"
        height="28"
        fill="currentColor"
      >
        <path d="M5 9h8V5l7 7-7 7v-4H5z" />
      </svg>
    </div>
  </a>
</aside>

<style>
  .jump-card {
    width: 100%;
    max-width: 340px;
    border-radius: 28px;
    backdrop-filter: blur(12px);
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.25) inset 0 1px 0 rgba(255, 255, 255, 0.1);
    overflow: hidden;
  }

  .jump-link {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1.25rem;
    color: inherit;
    text-decoration: none;
  }

  .jump-link:hover .arrow {
    transform: translateX(2px);
  }

  .jump-header {
    display: flex;
    align-items: center;
    gap: 0.9rem;
  }

  .avatar-wrap {
    position: relative;
    width: 64px;
    height: 64px;
    flex-shrink: 0;
  }

  .avatar {
    width: 100%;
    height: 100%;
    border-radius: 999px;
    object-fit: cover;
    border: 3px solid rgba(255, 255, 255, 0.18);
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.25);
  }

  .harvestsona-badge {
    position: absolute;
    right: -2px;
    bottom: -2px;
    width: 32px;
    height: 32px;
    border-radius: 999px;
    object-fit: cover;
    border: 2px solid rgba(255, 255, 255, 0.9);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
    background: rbga(255, 255, 255, 0.08);
  }

  .user-meta {
    min-width: 0;
    flex: 1;
  }

  .label {
    margin: 0;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    opacity: 0.7;
  }

  .username {
    margin: 0.2rem 0 0;
    font-size: 1.4rem;
    line-height: 1.1;
    word-break: break-word;
  }

  .arrow {
    flex-shrink: 0;
    opacity: 0.75;
    transition: transform 0.2s ease;
  }

  @media (max-width: 900px) {
    .jump-card {
      max-width: none;
    }
  }
</style>
