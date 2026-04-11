<script>
  import { activeWorkspace, activePage } from "../store.js";
  import { Play, Disc3 } from "lucide-svelte";
  import { onMount } from "svelte";

  const workspaces = ["1", "2", "3"];
  let currentTime = "";
  let currentDate = "";

  onMount(() => {
    const tick = () => {
      const now = new Date();
      currentTime = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      currentDate = now.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
    };
    tick();
    const iv = setInterval(tick, 30000);
    return () => clearInterval(iv);
  });

  function setWorkspace(ws) {
    activeWorkspace.set(ws);
    activePage.set("workspace");
  }
</script>

<header class="bar">
  <div class="bar-left">
    <span class="wordmark">buddy</span>
    <div class="ws-group">
      {#each workspaces as ws}
        <button
          class="ws-pill"
          class:active={$activeWorkspace === ws && $activePage === "workspace"}
          on:click={() => setWorkspace(ws)}
        >{ws}</button>
      {/each}
      <button class="ws-pill ws-add">+</button>
    </div>
  </div>

  <div class="bar-center">
    <span class="time">{currentTime}</span>
    <span class="date">{currentDate}</span>
  </div>

  <div class="bar-right">
    <div class="timer-chip">
      <span class="timer-dot" />
      <span class="timer-val">00:00</span>
    </div>
    <button class="control-chip">
      <Disc3 size={14} strokeWidth={1.5} />
    </button>
  </div>
</header>

<style>
  .bar {
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 20px;
    background: var(--bg-surface);
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
    position: relative;
  }

  .bar-left {
    display: flex;
    align-items: center;
    gap: 20px;
  }

  .wordmark {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-secondary);
    letter-spacing: 0.3px;
  }

  .ws-group {
    display: flex;
    gap: 2px;
  }

  .ws-pill {
    padding: 4px 10px;
    font-size: 12px;
    font-family: var(--font-mono);
    color: var(--text-tertiary);
    background: transparent;
    border: 1px solid transparent;
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .ws-pill:hover {
    color: var(--text-secondary);
    background: rgba(255, 255, 255, 0.03);
  }

  .ws-pill.active {
    color: var(--accent);
    background: var(--accent-dim);
    border-color: rgba(139, 92, 246, 0.12);
  }

  .ws-add {
    color: var(--text-tertiary);
  }

  .bar-center {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    line-height: 1.2;
  }

  .time {
    font-family: var(--font-mono);
    font-size: 13px;
    font-weight: 500;
    color: var(--text-primary);
    letter-spacing: 0.5px;
  }

  .date {
    font-size: 10px;
    color: var(--text-tertiary);
    letter-spacing: 0.3px;
  }

  .bar-right {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .timer-chip {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border-radius: 20px;
    background: var(--accent-dim);
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--accent);
  }

  .timer-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--accent);
    animation: breathe 2s ease-in-out infinite;
  }

  @keyframes breathe {
    0%, 100% { opacity: 0.3; }
    50% { opacity: 1; }
  }

  .control-chip {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--border);
    border-radius: 50%;
    background: transparent;
    color: var(--text-tertiary);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .control-chip:hover {
    color: var(--text-secondary);
    border-color: var(--border-active);
    background: rgba(255, 255, 255, 0.02);
  }
</style>
