<script>
  import { LayoutDashboard, CheckSquare, Timer, Bot, CalendarDays, Settings, User } from 'lucide-svelte';
  import { activePage } from '../store.js';

  const menuItems = [
    { id: 'dashboard', icon: LayoutDashboard },
    { id: 'tasks', icon: CheckSquare },
    { id: 'sessions', icon: Timer },
    { id: 'aichat', icon: Bot },
    { id: 'calendar', icon: CalendarDays },
  ];
  
  const bottomItems = [
    { id: 'settings', icon: Settings },
    { id: 'profile', icon: User }
  ];

  function setActive(id) {
    activePage.set(id);
  }
</script>

<aside class="sidebar">
  <div class="top-items">
    {#each menuItems as item}
      <button 
        class="icon-btn { $activePage === item.id ? 'active' : '' }"
        on:click={() => setActive(item.id)}
        aria-label={item.id}
      >
        <svelte:component this={item.icon} size={20} strokeWidth={2} />
      </button>
    {/each}
  </div>

  <div class="bottom-items">
    {#each bottomItems as item}
      <button 
        class="icon-btn { $activePage === item.id ? 'active' : '' }"
        on:click={() => setActive(item.id)}
        aria-label={item.id}
      >
        <svelte:component this={item.icon} size={20} strokeWidth={2} />
      </button>
    {/each}
  </div>
</aside>

<style>
  .sidebar {
    width: 54px;
    background: var(--bg-surface);
    border-right: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: center;
    padding: 24px 0;
    height: 100vh;
    z-index: 10;
  }

  .top-items, .bottom-items {
    display: flex;
    flex-direction: column;
    gap: 16px;
    align-items: center;
    width: 100%;
  }

  .icon-btn {
    background: transparent;
    border: none;
    color: var(--text-secondary);
    width: 40px;
    height: 40px;
    border-radius: 8px;
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    transition: all 0.2s;
  }

  .icon-btn:hover {
    color: var(--text-primary);
  }

  .icon-btn.active {
    background: var(--accent-dim);
    color: var(--accent);
  }
</style>
