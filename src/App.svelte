<script>
  import { activePage } from './lib/store.js';
  import Sidebar from './lib/components/Sidebar.svelte';
  import TopBar from './lib/components/TopBar.svelte';
  
  // Import Routes
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

<div class="app-layout">
  <Sidebar />
  <main class="main-column">
    <TopBar />
    <div class="content-area">
      <svelte:component this={routes[$activePage]} />
    </div>
  </main>
</div>

<style>
  :global(*) {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
  
  :global(html, body) {
    background: var(--bg-base);
    color: var(--text-primary);
    font-family: "Space Grotesk", sans-serif;
    height: 100%;
    overflow: hidden;
  }

  .app-layout {
    display: flex;
    height: 100vh;
    width: 100vw;
    background: var(--bg-base);
  }

  .main-column {
    display: flex;
    flex-direction: column;
    flex: 1;
    height: 100%;
    overflow: hidden;
  }

  .content-area {
    flex: 1;
    overflow: auto;
    position: relative;
    background: var(--bg-base);
  }
</style>
