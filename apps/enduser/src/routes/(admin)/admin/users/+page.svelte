<script lang="ts">
  import { page } from '$app/state';
  import PageContainer from '$lib/components/PageContainer.svelte';
  import UserRowActions from '$lib/components/UserRowActions.svelte';
  import { type Scope } from '@harvestsona/shared';

  let userList = $derived(page.data.userList ?? []);
  let admins = $derived(page.data.admins as Record<string, Scope[]>);
  let currentUserUid = $derived(page.data.user?.user?.uid ?? '');
  let streamerId = $derived(page.data.streamerId as string | undefined);
  let scopes = $derived(page.data.scopes as Scope[]);

  function isAdmin(uid: string) {
    return uid in admins;
  }
</script>

<svelte:head>
  <title>User Management</title>
</svelte:head>

<PageContainer>
  <h1>Users</h1>
  {#if scopes.includes('harvestsona:approve')}
    <p class="override-link"><a href="/admin/override">Override a user's harvestsona</a></p>
  {/if}

  {#if userList.length === 0}
    <p>No users found.</p>
  {:else}
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>User</th>
            <th>UID</th>
            <th>Status</th>
            <th>Ban Reason</th>
            <th>Scopes</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {#each userList as entry}
            <tr>
              <td>
                <div class="user-cell">
                  <img class="avatar" src={entry.profileImage} alt={entry.user.username} />
                  <span>{entry.user.username}</span>
                </div>
              </td>
              <td class="uid-cell">{entry.user.uid.substring(0, 12)}&hellip;</td>
              <td>
                {#if entry.banned}
                  <span class="badge badge-red">Banned</span>
                {:else}
                  <span class="badge badge-green">Active</span>
                {/if}
              </td>
              <td>
                {#if entry.banned}
                  {entry.bannedReason || 'No reason given'}
                {:else}
                  &mdash;
                {/if}
              </td>
              <td>
                {#if isAdmin(entry.user.uid)}
                  {#each admins[entry.user.uid] as scope}
                    <span class="scope-chip">{scope}</span>
                  {/each}
                {:else}
                  <span class="muted">&mdash;</span>
                {/if}
              </td>
              <td>
                <UserRowActions {entry} {admins} {currentUserUid} {streamerId} {scopes} />
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</PageContainer>

<style>
  .table-wrapper {
    overflow-x: auto;
  }

  .override-link a {
    color: #a78bfa;
    font-size: 0.85rem;
  }

  table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    background: rgba(255, 255, 255, 0.06);
    border-radius: 1rem;
    border: 1px solid rgba(255, 255, 255, 0.1);
    overflow: hidden;
  }

  th,
  td {
    padding: 0.75rem 1rem;
    text-align: left;
  }

  th {
    background: rgba(255, 255, 255, 0.08);
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    white-space: nowrap;
  }

  td {
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    vertical-align: middle;
  }

  .user-cell {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .avatar {
    width: 36px;
    height: 36px;
    border-radius: 999px;
    object-fit: cover;
    flex-shrink: 0;
    border: 2px solid rgba(255, 255, 255, 0.18);
  }

  .uid-cell {
    font-family: monospace;
    font-size: 0.85rem;
    opacity: 0.7;
  }

  .badge {
    display: inline-block;
    padding: 0.2rem 0.6rem;
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .badge-green {
    background: rgba(120, 194, 109, 0.25);
    color: #5daa52;
  }

  .badge-red {
    background: rgba(217, 92, 92, 0.25);
    color: #d95c5c;
  }

  .scope-chip {
    display: inline-block;
    padding: 0.15rem 0.5rem;
    margin: 0.15rem;
    border-radius: 999px;
    font-size: 0.75rem;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.15);
    white-space: nowrap;
  }

  .muted {
    opacity: 0.4;
  }

  @media (max-width: 900px) {
    th,
    td {
      padding: 0.5rem;
    }
  }
</style>
