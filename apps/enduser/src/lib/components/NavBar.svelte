<script lang="ts">
  import { page } from '$app/state';
  import { enhance } from '$app/forms';

  let menuOpen = $state(false);
  let isLoginPage = $derived(page.url.pathname.startsWith('/login'));
  let isAdmin = $derived(((page.data.scopes as string[] | undefined)?.length ?? 0) > 0);
  let user = $derived(page.data.user);

  function closeMenu() {
    menuOpen = false;
  }

  function toggleMenu() {
    menuOpen = !menuOpen;
  }
</script>

{#if !isLoginPage}
  <header class="navbar" class:menu-open={menuOpen}>
    <nav class="nav-inner">
      <button class="hamburger" onclick={toggleMenu} aria-label="Toggle menu">
        <span class="hamburger-line"></span>
        <span class="hamburger-line"></span>
        <span class="hamburger-line"></span>
      </button>

      <div class="nav-links">
        <a href="/gallery" class="nav-link" onclick={closeMenu}>Gallery</a>
        <a href="/profile" class="nav-link" onclick={closeMenu}>Profile</a>

        {#if isAdmin}
          <a href="/admin/pending" class="nav-link" onclick={closeMenu}>Pending</a>
          <a href="/admin/users" class="nav-link" onclick={closeMenu}>Users</a>
        {/if}

        <div class="nav-auth">
          {#if user}
            <form method="POST" action="/logout" use:enhance>
              <button type="submit" class="btn-red btn-sm">Logout</button>
            </form>
          {/if}
        </div>
      </div>
    </nav>
  </header>
{/if}

<style>
  .navbar {
    position: relative;
    width: 100%;
    background: rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 0 0 16px 16px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    margin-bottom: 1.5rem;
    z-index: 2;
  }

  .nav-inner {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    max-width: 80vw;
    margin: 0 auto;
    padding: 0.75rem 1.5rem;
  }

  .nav-links {
    display: flex;
    align-items: center;
    gap: 1.5rem;
  }

  .nav-link {
    color: var(--text);
    text-decoration: none;
    font-size: 1rem;
    font-weight: 600;
    padding: 0.4rem 0.6rem;
    border-radius: var(--radius-sm);
    transition:
      background var(--transition),
      color var(--transition);
    white-space: nowrap;
  }

  .nav-link:hover {
    background: rgba(120, 194, 109, 0.15);
    color: var(--green-3);
  }

  .nav-auth {
    margin-left: 0.5rem;
  }

  .btn-sm {
    padding: 0.5rem 1rem;
    font-size: 0.85rem;
  }

  .hamburger {
    display: none;
    flex-direction: column;
    gap: 5px;
    background: none;
    border: none;
    box-shadow: none;
    cursor: pointer;
    padding: 0.5rem;
  }

  .hamburger:hover {
    transform: none;
  }

  .hamburger:active {
    transform: none;
  }

  .hamburger-line {
    display: block;
    width: 24px;
    height: 3px;
    background: var(--text);
    border-radius: 3px;
    transition:
      transform var(--transition),
      opacity var(--transition);
  }

  .menu-open .hamburger-line:nth-child(1) {
    transform: translateY(8px) rotate(45deg);
  }

  .menu-open .hamburger-line:nth-child(2) {
    opacity: 0;
  }

  .menu-open .hamburger-line:nth-child(3) {
    transform: translateY(-8px) rotate(-45deg);
  }

  @media (max-width: 640px) {
    .hamburger {
      display: flex;
    }

    .nav-links {
      display: none;
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      flex-direction: column;
      align-items: stretch;
      gap: 0;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.5);
      border-radius: 0 0 16px 16px;
      padding: 0.75rem;
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
      z-index: 99;
    }

    .navbar.menu-open .nav-links {
      display: flex;
    }

    .nav-link {
      padding: 0.75rem 1rem;
    }

    .nav-auth {
      margin-left: 0;
      margin-top: 0.5rem;
      padding: 0.5rem 1rem;
    }
  }
</style>
