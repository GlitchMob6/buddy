<script>
  import { activeWorkspace } from '../lib/store.js';
</script>

<div class="workspace-area">
  {#if $activeWorkspace === 'focus'}
    <div class="focus-mode">
      <!-- Grid background pattern -->
      <div class="grid-overlay"></div>
    </div>
  {:else if $activeWorkspace === 'code'}
    <div class="app-stub">Code Editor Placeholder</div>
  {:else if $activeWorkspace === 'browser'}
    <div class="app-stub">Browser Placeholder</div>
  {:else if $activeWorkspace === 'pdf'}
    <div class="app-stub">PDF Viewer Placeholder</div>
  {:else if $activeWorkspace === 'notes'}
    <div class="app-stub">Notes App Placeholder</div>
  {/if}
</div>

<style>
  .workspace-area {
    width: 100%;
    height: 100%;
    position: relative;
    background: var(--bg-base);
  }

  .focus-mode {
    width: 100%;
    height: 100%;
    background: var(--bg-base);
    position: relative;
  }

  .grid-overlay {
    position: absolute;
    inset: 0;
    /* Diagonal grid texture */
    background-image: linear-gradient(var(--border) 1px, transparent 1px),
                      linear-gradient(90deg, var(--border) 1px, transparent 1px);
    background-size: 40px 40px;
    background-position: center;
    opacity: 0.3;
  }

  .app-stub {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
    color: var(--text-secondary);
    font-size: 18px;
    font-family: 'Space Grotesk', sans-serif;
  }
</style>
