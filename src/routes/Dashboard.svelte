<script>
  import { onMount } from 'svelte';

  let loaded = false;
  let stats = {};
  let activeSessionObj = null;
  let calendar = [];
  let weekly = [];

  onMount(async () => {
    try {
      const [resStats, resActive, resCalendar, resWeekly] = await Promise.all([
        fetch('http://localhost:8000/stats/today'),
        fetch('http://localhost:8000/sessions/active'),
        fetch('http://localhost:8000/calendar/week'),
        fetch('http://localhost:8000/stats/weekly')
      ]);

      stats = await resStats.json();
      activeSessionObj = await resActive.json();
      calendar = await resCalendar.json();
      weekly = await resWeekly.json();
    } catch (e) {
      console.error(e);
    } finally {
      loaded = true;
    }
  });

  $: maxTasks = weekly.length ? Math.max(...weekly.map(d => d.tasks_completed), 1) : 1;

  // Simple delta calculator
  $: delta = stats.focus_score - stats.focus_score_yesterday;
</script>

<div class="dashboard-container">
  
  <!-- Stats Row -->
  <div class="stats-row">
    <!-- Score -->
    <div class="stat-card">
      <div class="stat-label">Focus Score</div>
      {#if !loaded}
        <div class="skeleton stat-skel"></div>
      {:else}
        <div class="stat-value text-accent">{stats.focus_score}</div>
      {/if}
    </div>
    
    <!-- Time -->
    <div class="stat-card">
      <div class="stat-label">Time Today</div>
      {#if !loaded}
        <div class="skeleton stat-skel"></div>
      {:else}
        <div class="stat-value">{stats.time_today}</div>
      {/if}
    </div>
    
    <!-- Streak -->
    <div class="stat-card">
      <div class="stat-label">Day Streak</div>
      {#if !loaded}
        <div class="skeleton stat-skel"></div>
      {:else}
        <div class="stat-value">{stats.streak}</div>
      {/if}
    </div>
    
    <!-- Penalties -->
    <div class="stat-card">
      <div class="stat-label">Penalties</div>
      {#if !loaded}
        <div class="skeleton stat-skel"></div>
      {:else}
        <div class="stat-value text-red">{stats.penalties}</div>
      {/if}
    </div>
  </div>

  <!-- Widget Grid -->
  <div class="widget-grid">
    
    <!-- Left Tall: Active Session -->
    <div class="widget active-session-widget">
      {#if !loaded}
        <div class="skeleton w-full h-full"></div>
      {:else if activeSessionObj}
        <div class="session-info">
          <h3>{activeSessionObj.name || "Focus Session"}</h3>
          <div class="progress-container">
            <div class="progress-bar">
              <div class="progress-fill" style="width: 40%;"></div>
            </div>
          </div>
          <div class="session-stats">
            <span>Tasks: 2 / 5</span>
            <span>Time: 45:00</span>
          </div>
        </div>
      {:else}
        <div class="no-session">
          <div class="no-session-icon"></div>
          <h3>No Active Session</h3>
          <p>Ready to focus?</p>
          <button class="start-btn">Start Session</button>
        </div>
      {/if}
    </div>

    <!-- Top Right: Focus Score Ring -->
    <div class="widget focus-ring-widget">
      <div class="widget-title">Performance</div>
      {#if !loaded}
        <div class="skeleton w-full h-full"></div>
      {:else}
        <div class="ring-container">
          <svg viewBox="0 0 100 100" class="ring-svg">
            <circle class="ring-bg" cx="50" cy="50" r="40" />
            <circle class="ring-fill" cx="50" cy="50" r="40" stroke-dasharray="{251.2}" stroke-dashoffset="{251.2 - (251.2 * stats.focus_score) / 100}" />
          </svg>
          <div class="ring-center">
            <div class="ring-val">{stats.focus_score}%</div>
          </div>
        </div>
        <div class="ring-stats">
          <div class="rs-item">
            <span class="rs-label">vs Yest</span>
            <span class="rs-val {delta >= 0 ? 'text-green' : 'text-red'}">{delta >= 0 ? '+' : ''}{delta}</span>
          </div>
          <div class="rs-item">
            <span class="rs-label">Wk Avg</span>
            <span class="rs-val">{stats.focus_score_week_avg}</span>
          </div>
          <div class="rs-item">
            <span class="rs-label">Best</span>
            <span class="rs-val">{stats.focus_score_best}</span>
          </div>
        </div>
      {/if}
    </div>

    <!-- Middle/Right Bottom: Calendar Mini -->
    <div class="widget calendar-widget">
      <div class="widget-title">This Week</div>
      {#if !loaded}
        <div class="skeleton w-full h-full"></div>
      {:else}
        <div class="cal-row">
          {#each calendar as day, index}
            <div class="cal-day">
              <span class="cal-name">{day.date.charAt(0)}</span>
              <div class="cal-pill {index === 3 ? 'is-today' : ''} {day.has_session && index !== 3 ? 'has-session' : ''} {day.is_deadline ? 'has-deadline' : ''}">
                {day.day}
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <!-- Bottom Right: Weekly Bar Chart -->
    <div class="widget chart-widget">
      <div class="widget-title">Task Completion</div>
      {#if !loaded}
        <div class="skeleton w-full h-full"></div>
      {:else}
        <div class="chart-container">
          {#each weekly as entry, index}
            <div class="bar-group">
              <div class="bar-bg">
                <!-- Highlight "today" as index 3 purely for visual demo -->
                <div class="bar-fill {index === 3 ? 'today-bar' : ''}" style="height: {(entry.tasks_completed / maxTasks) * 100}%;"></div>
              </div>
              <span class="bar-label">{entry.day}</span>
            </div>
          {/each}
        </div>
      {/if}
    </div>

  </div>
</div>

<style>
  .dashboard-container {
    padding: 32px;
    display: flex;
    flex-direction: column;
    gap: 24px;
    height: 100%;
    color: var(--text-primary);
  }

  .skeleton {
    background: var(--bg-elevated);
    border-radius: 6px;
    animation: pulse 1.2s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 0.4; }
    50% { opacity: 0.8; }
  }

  .w-full { width: 100%; }
  .h-full { height: 100%; min-height: 120px; }

  /* Stats Row */
  .stats-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
  }

  .stat-card {
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .stat-label {
    color: var(--text-secondary);
    font-size: 13px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .stat-value {
    font-family: 'JetBrains Mono', monospace;
    font-size: 28px;
    font-weight: 600;
  }

  .stat-skel {
    width: 60px;
    height: 34px;
  }

  .text-accent { color: var(--accent); }
  .text-red { color: var(--red); }
  .text-green { color: var(--green); }

  /* Widget Grid */
  .widget-grid {
    display: grid;
    grid-template-columns: 2fr 1fr 1fr;
    grid-template-rows: auto auto;
    gap: 16px;
    flex: 1;
  }

  .widget {
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 24px;
    display: flex;
    flex-direction: column;
  }

  .widget-title {
    color: var(--text-secondary);
    font-size: 14px;
    font-weight: 500;
    margin-bottom: 20px;
  }

  /* Active Session */
  .active-session-widget {
    grid-column: 1 / 2;
    grid-row: 1 / 3;
    background: var(--accent-dim);
    border-color: var(--border-active);
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .no-session {
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }

  .no-session-icon {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: var(--bg-elevated);
    margin-bottom: 8px;
  }

  .no-session h3 {
    font-size: 20px;
    font-weight: 600;
  }

  .no-session p {
    color: var(--text-secondary);
    font-size: 14px;
  }

  .start-btn {
    margin-top: 16px;
    background: var(--accent);
    color: var(--text-primary);
    border: none;
    padding: 10px 24px;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
  }
  .start-btn:hover { background: #5544e6; }

  /* Focus Ring Widget */
  .focus-ring-widget {
    grid-column: 2 / 3;
    grid-row: 1 / 2;
  }

  .ring-container {
    position: relative;
    width: 120px;
    height: 120px;
    margin: 0 auto;
  }

  .ring-svg {
    transform: rotate(-90deg);
    width: 100%;
    height: 100%;
  }

  .ring-bg {
    fill: none;
    stroke: var(--bg-elevated);
    stroke-width: 8;
  }

  .ring-fill {
    fill: none;
    stroke: var(--accent);
    stroke-width: 8;
    stroke-linecap: round;
    transition: stroke-dashoffset 1s ease-out;
  }

  .ring-center {
    position: absolute;
    inset: 0;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .ring-val {
    font-family: 'JetBrains Mono', monospace;
    font-size: 24px;
    font-weight: 600;
  }

  .ring-stats {
    display: flex;
    justify-content: space-between;
    margin-top: 24px;
  }

  .rs-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }

  .rs-label {
    font-size: 11px;
    color: var(--text-secondary);
  }

  .rs-val {
    font-family: 'JetBrains Mono', monospace;
    font-size: 14px;
    font-weight: 600;
  }

  /* Calendar Widget */
  .calendar-widget {
    grid-column: 3 / 4;
    grid-row: 1 / 2;
  }

  .cal-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    height: 100%;
  }

  .cal-day {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  .cal-name {
    font-size: 12px;
    color: var(--text-secondary);
  }

  .cal-pill {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    display: flex;
    justify-content: center;
    align-items: center;
    font-family: 'JetBrains Mono', monospace;
    font-size: 13px;
    background: transparent;
    color: var(--text-secondary);
  }

  .has-session { background: var(--accent-dim); color: var(--text-primary); }
  .is-today { background: var(--accent); color: var(--text-primary); }
  .has-deadline { border: 1px solid var(--red); color: var(--red); }

  /* Chart Widget */
  .chart-widget {
    grid-column: 2 / 4;
    grid-row: 2 / 3;
  }

  .chart-container {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    height: 100px;
    padding-top: 10px;
  }

  .bar-group {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    height: 100%;
  }

  .bar-bg {
    width: 24px;
    flex: 1;
    background: transparent;
    display: flex;
    align-items: flex-end;
    border-radius: 4px;
  }

  .bar-fill {
    width: 100%;
    background: var(--bg-elevated);
    border-radius: 4px;
    transition: height 0.5s ease;
  }

  .today-bar {
    background: var(--accent);
  }

  .bar-label {
    font-size: 12px;
    color: var(--text-secondary);
  }
</style>
