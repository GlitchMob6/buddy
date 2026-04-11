<script>
  import { LayoutDashboard, CheckSquare, Timer, Bot, CalendarDays, Settings, User } from 'lucide-svelte';
  import { activePage } from '../store.js';

  const navItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'tasks', icon: CheckSquare, label: 'Tasks' },
    { id: 'sessions', icon: Timer, label: 'Sessions' },
    { id: 'aichat', icon: Bot, label: 'AI Chat' },
    { id: 'calendar', icon: CalendarDays, label: 'Calendar' },
  ];

  const utilItems = [
    { id: 'settings', icon: Settings, label: 'Settings' },
    { id: 'profile', icon: User, label: 'Profile' },
  ];
</script>

<nav class="rail">
  <div class="rail-top">
    <div class="brand">B</div>
    <div class="nav-group">
      {#each navItems as item}
        <button
          class="nav-item"
          class:active={$activePage === item.id}
          on:click={() => activePage.set(item.id)}
          title={item.label}
        >
          <div class="indicator" />
          <svelte:component this={item.icon} size={18} strokeWidth={1.8} />
        </button>
      {/each}
    </div>
  </div>
  <div class="nav-group">
    {#each utilItems as item}
      <button
        class="nav-item"
        class:active={$activePage === item.id}
        on:click={() => activePage.set(item.id)}
        title={item.label}
      >
        <div class="indicator" />
        <svelte:component this={item.icon} size={18} strokeWidth={1.8} />
      </button>
    {/each}
  </div>
</nav>

<style>
  .rail {
    width: 56px;
    background: var(--bg-surface);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: center;
    padding: 16px 0 20px;
    border-right: 1px solid var(--border);
    flex-shrink: 0;
  }

  .rail-top {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 28px;
  }

  .brand {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 15px;
    font-weight: 700;
    color: var(--bg-base);
    background: var(--accent);
    border-radius: var(--radius-sm);
    letter-spacing: -0.5px;
  }

  .nav-group {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }

  .nav-item {
    position: relative;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    background: transparent;
    color: var(--text-tertiary);
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: color 0.15s ease, background 0.15s ease;
  }

  .nav-item:hover {
    color: var(--text-secondary);
    background: rgba(255, 255, 255, 0.03);
  }

  .nav-item.active {
    color: var(--text-primary);
    background: rgba(255, 255, 255, 0.05);
  }

  .indicator {
    position: absolute;
    left: -8px;
    width: 3px;
    height: 0;
    background: var(--accent);
    border-radius: 0 2px 2px 0;
    transition: height 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .nav-item.active .indicator {
    height: 20px;
  }

  .nav-item:hover:not(.active) .indicator {
    height: 8px;
  }
</style>
