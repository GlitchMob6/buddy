<script>
  import { onMount } from 'svelte';
  import { Play, Flame, Clock, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-svelte';

  let loaded = false;
  let stats = {};
  let session = null;
  let calendar = [];
  let weekly = [];

  onMount(async () => {
    try {
      const [s, a, c, w] = await Promise.all([
        fetch('http://localhost:8000/stats/today'),
        fetch('http://localhost:8000/sessions/active'),
        fetch('http://localhost:8000/calendar/week'),
        fetch('http://localhost:8000/stats/weekly')
      ]);
      stats = await s.json();
      session = await a.json();
      calendar = await c.json();
      weekly = await w.json();
    } catch (e) {
      console.error('Dashboard fetch error:', e);
    } finally {
      loaded = true;
    }
  });

  $: maxTasks = weekly.length ? Math.max(...weekly.map(d => d.tasks_completed), 1) : 1;
  $: delta = (stats.focus_score || 0) - (stats.focus_score_yesterday || 0);
  $: circumference = 2 * Math.PI * 42;
  $: offset = circumference - (circumference * (stats.focus_score || 0)) / 100;
</script>

<div class="dash">

  <!-- Greeting & context -->
  <div class="header">
    <div>
      <h1>Dashboard</h1>
      <p class="subtitle">Here's your progress today</p>
    </div>
  </div>

  <!-- Metrics strip -->
  <div class="metrics">
    <div class="metric">
      {#if !loaded}<div class="skel skel-metric" />{:else}
        <div class="metric-val accent">{stats.focus_score}</div>
        <div class="metric-label">Focus</div>
      {/if}
    </div>
    <div class="metric-sep" />
    <div class="metric">
      {#if !loaded}<div class="skel skel-metric" />{:else}
        <div class="metric-val">{stats.time_today}</div>
        <div class="metric-label">Time</div>
      {/if}
    </div>
    <div class="metric-sep" />
    <div class="metric">
      {#if !loaded}<div class="skel skel-metric" />{:else}
        <div class="metric-val">
          <Flame size={16} strokeWidth={1.5} />
          {stats.streak}
        </div>
        <div class="metric-label">Streak</div>
      {/if}
    </div>
    <div class="metric-sep" />
    <div class="metric">
      {#if !loaded}<div class="skel skel-metric" />{:else}
        <div class="metric-val" class:warn={stats.penalties > 0}>{stats.penalties}</div>
        <div class="metric-label">Penalties</div>
      {/if}
    </div>
  </div>

  <!-- Main grid -->
  <div class="grid">

    <!-- Session card (tall left) -->
    <div class="card session-card">
      {#if !loaded}
        <div class="skel" style="height: 100%;" />
      {:else if session}
        <div class="session-active">
          <span class="session-tag">In progress</span>
          <h3>{session.name || 'Focus Session'}</h3>
          <div class="progress-track">
            <div class="progress-bar" style="width: 40%;" />
          </div>
          <div class="session-meta">
            <span>2 / 5 tasks</span>
            <span class="mono">45:12</span>
          </div>
        </div>
      {:else}
        <div class="session-empty">
          <div class="empty-ring">
            <Play size={20} strokeWidth={1.5} style="margin-left: 2px;" />
          </div>
          <h3>No session running</h3>
          <p>Start one to begin tracking</p>
          <button class="cta">Start Session</button>
        </div>
      {/if}
    </div>

    <!-- Focus ring -->
    <div class="card ring-card">
      <span class="card-label">Performance</span>
      {#if !loaded}
        <div class="skel" style="height: 140px;" />
      {:else}
        <div class="ring-wrap">
          <svg viewBox="0 0 100 100" class="ring-svg">
            <circle cx="50" cy="50" r="42" class="ring-track" />
            <circle cx="50" cy="50" r="42"
              class="ring-value"
              stroke-dasharray={circumference}
              stroke-dashoffset={offset}
            />
          </svg>
          <div class="ring-label">
            <span class="ring-num">{stats.focus_score}</span>
          </div>
        </div>
        <div class="ring-footer">
          <div class="rf-item">
            <span class="rf-val" class:positive={delta >= 0} class:negative={delta < 0}>
              {#if delta >= 0}<TrendingUp size={12} />{:else}<TrendingDown size={12} />{/if}
              {delta >= 0 ? '+' : ''}{delta}
            </span>
            <span class="rf-label">vs yesterday</span>
          </div>
          <div class="rf-item">
            <span class="rf-val">{stats.focus_score_week_avg}</span>
            <span class="rf-label">week avg</span>
          </div>
          <div class="rf-item">
            <span class="rf-val">{stats.focus_score_best}</span>
            <span class="rf-label">best</span>
          </div>
        </div>
      {/if}
    </div>

    <!-- Calendar -->
    <div class="card cal-card">
      <span class="card-label">This Week</span>
      {#if !loaded}
        <div class="skel" style="height: 60px;" />
      {:else}
        <div class="cal-strip">
          {#each calendar as day, i}
            <div class="cal-col">
              <span class="cal-letter">{day.date.charAt(0)}</span>
              <div class="cal-dot"
                class:today={i === 3}
                class:has-work={day.has_session && i !== 3}
                class:deadline={day.is_deadline}
              >
                {day.day}
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <!-- Bar chart -->
    <div class="card chart-card">
      <span class="card-label">Completion</span>
      {#if !loaded}
        <div class="skel" style="height: 80px;" />
      {:else}
        <div class="bars">
          {#each weekly as entry, i}
            <div class="bar-col">
              <div class="bar-track">
                <div
                  class="bar"
                  class:bar-today={i === 3}
                  style="height: {(entry.tasks_completed / maxTasks) * 100}%;"
                />
              </div>
              <span class="bar-day">{entry.day}</span>
            </div>
          {/each}
        </div>
      {/if}
    </div>

  </div>
</div>

<style>
  /* ---------- Layout ---------- */
  .dash {
    padding: 28px 32px 40px;
    display: flex;
    flex-direction: column;
    gap: 24px;
    max-width: 1100px;
  }

  .header h1 {
    font-size: 20px;
    font-weight: 600;
    letter-spacing: -0.3px;
  }

  .subtitle {
    font-size: 13px;
    color: var(--text-tertiary);
    margin-top: 2px;
  }

  /* ---------- Skeleton ---------- */
  .skel {
    background: var(--bg-elevated);
    border-radius: var(--radius-sm);
    animation: shimmer 1.8s ease-in-out infinite;
  }

  .skel-metric { width: 48px; height: 28px; }

  @keyframes shimmer {
    0%, 100% { opacity: 0.3; }
    50% { opacity: 0.6; }
  }

  /* ---------- Metrics strip ---------- */
  .metrics {
    display: flex;
    align-items: center;
    gap: 0;
    padding: 16px 24px;
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .metrics:hover {
    background: var(--bg-hover);
    border-color: var(--border-active);
    transform: translateY(-2px);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
  }

  .metric {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }

  .metric-val {
    font-family: var(--font-mono);
    font-size: 22px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 6px;
    letter-spacing: -0.5px;
  }

  .metric-val.accent { color: var(--accent); }
  .metric-val.warn { color: var(--red); }

  .metric-label {
    font-size: 11px;
    color: var(--text-tertiary);
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .metric-sep {
    width: 1px;
    height: 32px;
    background: var(--border);
  }

  /* ---------- Grid ---------- */
  .grid {
    display: grid;
    grid-template-columns: 1.2fr 1fr 1fr;
    grid-template-rows: 1fr 1fr;
    gap: 12px;
    flex: 1;
    min-height: 320px;
  }

  .card {
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 20px;
    display: flex;
    flex-direction: column;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .card:hover {
    border-color: var(--border-active);
    background: var(--bg-hover);
    transform: translateY(-2px);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  }

  .card-label {
    font-size: 11px;
    font-weight: 500;
    color: var(--text-tertiary);
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 16px;
  }

  /* ---------- Session card ---------- */
  .session-card {
    grid-row: 1 / 3;
    background: linear-gradient(
      165deg,
      var(--accent-dim) 0%,
      var(--bg-surface) 50%
    );
  }

  .session-card:hover {
    background: linear-gradient(
      165deg,
      var(--accent-glow) 0%,
      var(--bg-hover) 50%
    );
  }

  .session-empty {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    text-align: center;
  }

  .empty-ring {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    border: 1px solid var(--border-active);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--accent);
    margin-bottom: 8px;
  }

  .session-empty h3 {
    font-size: 16px;
    font-weight: 500;
    color: var(--text-primary);
  }

  .session-empty p {
    font-size: 13px;
    color: var(--text-tertiary);
  }

  .cta {
    margin-top: 12px;
    padding: 8px 20px;
    font-size: 13px;
    font-weight: 500;
    font-family: var(--font-sans);
    color: var(--bg-base);
    background: var(--accent);
    border: none;
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .cta:hover {
    background: var(--accent-hover);
    transform: translateY(-1px);
    box-shadow: 0 4px 14px var(--accent-glow);
  }

  .session-active {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .session-tag {
    font-size: 11px;
    font-weight: 500;
    color: var(--green);
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .session-active h3 {
    font-size: 18px;
    font-weight: 500;
  }

  .progress-track {
    height: 4px;
    background: var(--bg-elevated);
    border-radius: 2px;
    overflow: hidden;
  }

  .progress-bar {
    height: 100%;
    background: var(--accent);
    border-radius: 2px;
    transition: width 0.6s ease;
  }

  .session-meta {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
    color: var(--text-secondary);
  }

  .mono { font-family: var(--font-mono); }

  /* ---------- Focus ring ---------- */
  .ring-card {
    grid-column: 2 / 3;
    grid-row: 1 / 2;
    align-items: center;
  }

  .ring-wrap {
    position: relative;
    width: 110px;
    height: 110px;
    margin: 0 auto 16px;
  }

  .ring-svg {
    width: 100%;
    height: 100%;
    transform: rotate(-90deg);
  }

  .ring-track {
    fill: none;
    stroke: var(--bg-elevated);
    stroke-width: 5;
  }

  .ring-value {
    fill: none;
    stroke: var(--accent);
    stroke-width: 5;
    stroke-linecap: round;
    transition: stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .ring-label {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .ring-num {
    font-family: var(--font-mono);
    font-size: 26px;
    font-weight: 600;
    letter-spacing: -1px;
  }

  .ring-footer {
    display: flex;
    justify-content: center;
    gap: 24px;
  }

  .rf-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
  }

  .rf-val {
    font-family: var(--font-mono);
    font-size: 13px;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 3px;
  }

  .rf-val.positive { color: var(--green); }
  .rf-val.negative { color: var(--red); }

  .rf-label {
    font-size: 10px;
    color: var(--text-tertiary);
  }

  /* ---------- Calendar ---------- */
  .cal-card {
    grid-column: 3 / 4;
    grid-row: 1 / 2;
  }

  .cal-strip {
    display: flex;
    justify-content: space-between;
    flex: 1;
    align-items: center;
  }

  .cal-col {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
  }

  .cal-letter {
    font-size: 11px;
    color: var(--text-tertiary);
  }

  .cal-dot {
    width: 30px;
    height: 30px;
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--text-tertiary);
    transition: all 0.15s ease;
  }

  .cal-dot.today {
    background: var(--accent);
    color: var(--bg-base);
    font-weight: 600;
  }

  .cal-dot.has-work {
    background: var(--accent-dim);
    color: var(--text-primary);
  }

  .cal-dot.deadline {
    box-shadow: inset 0 0 0 1px var(--red);
    color: var(--red);
  }

  /* ---------- Bar chart ---------- */
  .chart-card {
    grid-column: 2 / 4;
    grid-row: 2 / 3;
  }

  .bars {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    flex: 1;
    gap: 8px;
  }

  .bar-col {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    height: 100%;
  }

  .bar-track {
    width: 100%;
    flex: 1;
    display: flex;
    align-items: flex-end;
  }

  .bar {
    width: 100%;
    background: var(--bg-elevated);
    border-radius: 3px 3px 0 0;
    transition: height 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    min-height: 2px;
  }

  .bar-today {
    background: var(--accent);
    box-shadow: 0 0 12px var(--accent-glow);
  }

  .bar-day {
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--text-tertiary);
  }
</style>
