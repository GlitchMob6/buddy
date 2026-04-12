<script>
  import { activePage } from './lib/store.js';
  import Sidebar from './lib/components/Sidebar.svelte';
  import TopBar from './lib/components/TopBar.svelte';

  import Dashboard from './routes/Dashboard.svelte';
  import Tasks from './routes/Tasks.svelte';
  import Sessions from './routes/Sessions.svelte';
  import AIChat from './routes/AIChat.svelte';
  import Calendar from './routes/Calendar.svelte';
  import Settings from './routes/Settings.svelte';
  import Profile from './routes/Profile.svelte';
  import Workspace from './routes/Workspace.svelte';

  const routes = {
    dashboard: Dashboard,
    tasks: Tasks,
    sessions: Sessions,
    aichat: AIChat,
    calendar: Calendar,
    settings: Settings,
    profile: Profile,
    workspace: Workspace
  };
</script>

<div class="app-shell">
  <Sidebar />
  <div class="main-col">
    <TopBar />
    <div class="view">
      <svelte:component this={routes[$activePage]} />
    </div>
  </div>
</div>

<style>
  .app-shell {
    display: flex;
    height: 100vh;
    width: 100vw;
    background: var(--bg-base);
    overflow: hidden;
  }

  .main-col {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
  }

  .view {
    flex: 1;
    overflow: hidden;
    background: var(--bg-base);
  }
</style>
