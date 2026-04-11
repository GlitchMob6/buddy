<script>
  import { activeWorkspace, activePage } from "../store.js";
  import { PlayCircle, Clock } from "lucide-svelte";
  import { onMount } from "svelte";

  const workspaces = ["1", "2", "3"];

  let currentTime = "";

  onMount(() => {
    const updateTime = () => {
      const now = new Date();
      currentTime = now.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  });

  function setWorkspace(ws) {
    activeWorkspace.set(ws);
    activePage.set("workspace");
  }
</script>

<header class="topbar">
  <div class="left-section">
    <div class="wordmark">BUDDY</div>
    <div class="pills">
      {#each workspaces as ws}
        <button
          class="pill {$activeWorkspace === ws && $activePage === 'workspace'
            ? 'active'
            : ''}"
          on:click={() => setWorkspace(ws)}
        >
          {ws}
        </button>
      {/each}
      <button class="pill add-pill">+</button>
    </div>
  </div>

  <div class="center-section">
    <div class="clock">{currentTime}</div>
  </div>

  <div class="right-section">
    <div class="session-timer">
      <span class="dot pulse"></span>
      <span class="timer-text">00:00:00</span>
    </div>
    <button class="music-player">
      <PlayCircle size={18} />
      <span>Music</span>
    </button>
  </div>
</header>

<style>
  .topbar {
    width: 100%;
    height: 54px;
    background: var(--bg-surface);
    border-bottom: 1px solid var(--border);
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 16px;
    z-index: 5;
  }

  .left-section {
    display: flex;
    align-items: center;
    gap: 24px;
  }

  .wordmark {
    color: var(--accent);
    font-weight: 800;
    font-size: 16px;
    letter-spacing: 1px;
    text-transform: uppercase;
  }

  .pills {
    display: flex;
    gap: 8px;
    background: var(--bg-base);
    padding: 4px;
    border-radius: 8px;
    border: 1px solid var(--border);
  }

  .pill {
    background: transparent;
    border: 1px solid transparent;
    color: var(--text-secondary);
    font-size: 13px;
    padding: 4px 12px;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
    font-family: inherit;
    text-transform: lowercase;
  }

  .pill:hover {
    color: var(--text-primary);
  }

  .pill.active {
    background: var(--accent-dim);
    color: var(--accent);
    border-color: var(--border-active);
  }

  .add-pill {
    font-size: 16px;
    padding: 4px 8px;
  }

  .center-section {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
  }

  .clock {
    font-family: "JetBrains Mono", monospace;
    color: var(--text-primary);
    font-size: 14px;
    font-weight: 500;
  }

  .right-section {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .session-timer {
    display: flex;
    align-items: center;
    gap: 8px;
    font-family: "JetBrains Mono", monospace;
    color: var(--accent);
    font-size: 13px;
    background: rgba(124, 106, 247, 0.1);
    padding: 4px 12px;
    border-radius: 12px;
  }

  .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--accent);
  }

  .pulse {
    animation: flash 1.5s infinite;
  }

  @keyframes flash {
    0% {
      opacity: 0.4;
    }
    50% {
      opacity: 1;
    }
    100% {
      opacity: 0.4;
    }
  }

  .music-player {
    display: flex;
    align-items: center;
    gap: 6px;
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    color: var(--text-secondary);
    padding: 6px 12px;
    border-radius: 16px;
    font-size: 13px;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.2s;
    color: rgb(80, 222, 80);
  }

  .music-player:hover {
    color: var(--text-primary);
    border-color: var(--border);
  }
</style>
