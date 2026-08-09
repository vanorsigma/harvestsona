<script lang="ts">
  import { enhance } from '$app/forms';
  import { SCOPES, type Scope, type AdminAllUserView } from '@harvestsona/shared';

  let {
    entry,
    admins,
    currentUserUid,
    streamerId,
    scopes
  }: {
    entry: AdminAllUserView;
    admins: Record<string, Scope[]>;
    currentUserUid: string;
    streamerId?: string;
    scopes: Scope[];
  } = $props();

  function isAdmin(uid: string) {
    return uid in admins;
  }

  function cannotModify(uid: string) {
    return uid === currentUserUid || uid === streamerId;
  }

  function cannotBan(uid: string) {
    return uid === currentUserUid || uid === streamerId || isAdmin(uid);
  }

  /// An acting admin may only touch (grant or revoke) scopes they themselves hold.
  function canProvision(scope: Scope) {
    return scopes.includes(scope);
  }
</script>

<div class="actions-stack">
  {#if scopes.includes('user:ban')}
    {#if entry.banned}
      <form method="POST" action="?/unban" use:enhance>
        <input type="hidden" name="uid" value={entry.user.uid} />
        <button
          type="submit"
          class="btn-green btn-sm"
          disabled={cannotModify(entry.user.uid) || isAdmin(entry.user.uid)}
        >
          Unban
        </button>
      </form>
    {:else}
      <form method="POST" action="?/ban" use:enhance>
        <input type="hidden" name="uid" value={entry.user.uid} />
        <div class="ban-row">
          <input
            type="text"
            name="reason"
            placeholder="Reason"
            class="reason-input"
            autocomplete="off"
          />
          <button type="submit" class="btn-red btn-sm" disabled={cannotBan(entry.user.uid)}>
            Ban
          </button>
        </div>
      </form>
    {/if}
  {/if}

  {#if scopes.includes('user:delete')}
    <form method="POST" action="?/deleteUser" use:enhance>
      <input type="hidden" name="uid" value={entry.user.uid} />
      <button type="submit" class="btn-red btn-sm" disabled={cannotModify(entry.user.uid)}>
        Delete
      </button>
    </form>
  {/if}

  {#if scopes.includes('admin:appoint') && !isAdmin(entry.user.uid)}
    <form method="POST" action="?/appointAdmin" use:enhance>
      <input type="hidden" name="uid" value={entry.user.uid} />
      <details class="scope-details">
        <summary class="btn-green btn-sm">Make Admin</summary>
        <div class="scope-checkboxes">
          {#each SCOPES as scope}
            {@const grantable = canProvision(scope)}
            <label class={!grantable ? 'scope-locked' : ''}>
              <input type="checkbox" name="scopes" value={scope} disabled={!grantable} />
              {scope}
            </label>
          {/each}
        </div>
        <button type="submit" class="btn-green btn-sm">Confirm</button>
      </details>
    </form>
  {/if}

  {#if isAdmin(entry.user.uid)}
    {#if scopes.includes('admin:appoint')}
      <form method="POST" action="?/updateScopes" use:enhance>
        <input type="hidden" name="uid" value={entry.user.uid} />
        <details class="scope-details">
          <summary class="btn-green btn-sm">Edit Scopes</summary>
          <div class="scope-checkboxes">
            {#each SCOPES as scope}
              {@const grantable = canProvision(scope)}
              {@const targetHas = admins[entry.user.uid].includes(scope)}
              <label class={!grantable ? 'scope-locked' : ''}>
                <input
                  type="checkbox"
                  name="scopes"
                  value={scope}
                  checked={targetHas}
                  disabled={!grantable}
                />
                {scope}
              </label>
              <!-- Preserve scopes the acting admin is not permitted to touch:
                   disabled controls are not submitted, so re-emit them as a
                   hidden input when the target already holds them. -->
              {#if !grantable && targetHas}
                <input type="hidden" name="scopes" value={scope} />
              {/if}
            {/each}
          </div>
          <button type="submit" class="btn-green btn-sm">Confirm</button>
        </details>
      </form>
    {/if}

    {#if scopes.includes('admin:remove')}
      <form method="POST" action="?/removeAdmin" use:enhance>
        <input type="hidden" name="uid" value={entry.user.uid} />
        <button type="submit" class="btn-red btn-sm" disabled={cannotModify(entry.user.uid)}>
          Remove Admin
        </button>
      </form>
    {/if}
  {/if}
</div>

<style>
  .actions-stack {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    min-width: 160px;
  }

  .actions-stack form {
    display: contents;
  }

  .ban-row {
    display: flex;
    gap: 0.4rem;
    align-items: center;
  }

  .ban-row .reason-input {
    width: 100px;
    padding: 0.3rem 0.5rem;
    font-size: 0.8rem;
  }

  .btn-sm {
    padding: 0.4rem 0.8rem;
    font-size: 0.8rem;
    white-space: nowrap;
  }

  .scope-checkboxes {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding: 0.5rem 0;
  }

  .scope-checkboxes label {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.8rem;
    font-weight: 400;
    margin: 0;
    cursor: pointer;
    white-space: nowrap;
  }

  .scope-checkboxes label.scope-locked {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .scope-checkboxes input[type='checkbox'] {
    width: auto;
    margin: 0;
  }

  .scope-details {
    position: relative;
  }

  .scope-details summary {
    list-style: none;
    cursor: pointer;
    display: inline-block;
  }

  .scope-details summary::-webkit-details-marker {
    display: none;
  }

  .scope-details[open] summary {
    margin-bottom: 0.25rem;
  }

  .btn-sm:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    transform: none !important;
  }

  @media (max-width: 900px) {
    .ban-row {
      flex-direction: column;
      align-items: stretch;
    }

    .ban-row .reason-input {
      width: 100%;
    }
  }
</style>
