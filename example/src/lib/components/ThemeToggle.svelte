<script lang="ts">
  interface Props {
    theme: 'light' | 'dark';
    sidebarOpen: boolean;
    onToggleTheme: () => void;
    onToggleSidebar: () => void;
  }

  let { theme, sidebarOpen, onToggleTheme, onToggleSidebar }: Props = $props();
</script>

<div class="theme-controls">
  <div class="control-group">
    <button 
      onclick={onToggleTheme} 
      class="theme-btn"
      title="Toggle theme"
    >
      <span class="theme-icon">
        {theme === 'light' ? '🌙' : '☀️'}
      </span>
      <span class="theme-text">
        {theme === 'light' ? 'Dark' : 'Light'} Mode
      </span>
    </button>
    
    <div class="theme-indicator">
      <div class="indicator-track" class:dark={theme === 'dark'}>
        <div class="indicator-thumb" class:dark={theme === 'dark'}></div>
      </div>
    </div>
  </div>

  <div class="control-group">
    <button 
      onclick={onToggleSidebar} 
      class="sidebar-btn"
      class:active={sidebarOpen}
      title="{sidebarOpen ? 'Close' : 'Open'} sidebar"
    >
      <span class="sidebar-icon">
        {sidebarOpen ? '⏏️' : '📋'}
      </span>
      <span class="sidebar-text">
        {sidebarOpen ? 'Hide' : 'Show'} Stats
      </span>
    </button>
  </div>
</div>

<style>
  .theme-controls {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.5rem;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
  }

  .control-group {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .theme-btn, .sidebar-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border: 1px solid rgba(255, 255, 255, 0.3);
    background: rgba(255, 255, 255, 0.1);
    color: inherit;
    border-radius: 8px;
    cursor: pointer;
    font-size: 0.9rem;
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
  }

  .theme-btn::before, .sidebar-btn::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
    transition: left 0.5s ease;
  }

  .theme-btn:hover::before, .sidebar-btn:hover::before {
    left: 100%;
  }

  .theme-btn:hover, .sidebar-btn:hover {
    background: rgba(255, 255, 255, 0.2);
    border-color: rgba(255, 255, 255, 0.4);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  }

  .theme-btn:active, .sidebar-btn:active {
    transform: translateY(0);
  }

  .sidebar-btn.active {
    background: rgba(0, 123, 255, 0.2);
    border-color: rgba(0, 123, 255, 0.4);
  }

  .theme-icon, .sidebar-icon {
    font-size: 1.1rem;
    transition: transform 0.3s ease;
  }

  .theme-btn:hover .theme-icon {
    transform: rotate(20deg) scale(1.1);
  }

  .sidebar-btn:hover .sidebar-icon {
    transform: scale(1.1);
  }

  .theme-text, .sidebar-text {
    font-weight: 500;
    white-space: nowrap;
  }

  .theme-indicator {
    display: flex;
    align-items: center;
  }

  .indicator-track {
    width: 36px;
    height: 20px;
    background: #e9ecef;
    border-radius: 10px;
    position: relative;
    transition: background-color 0.3s ease;
    border: 1px solid rgba(0,0,0,0.1);
  }

  .indicator-track.dark {
    background: #495057;
  }

  .indicator-thumb {
    width: 16px;
    height: 16px;
    background: #007bff;
    border-radius: 50%;
    position: absolute;
    top: 1px;
    left: 2px;
    transition: transform 0.3s ease, background-color 0.3s ease;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  }

  .indicator-thumb.dark {
    transform: translateX(16px);
    background: #ffc107;
  }

  @media (max-width: 640px) {
    .theme-controls {
      flex-direction: column;
      gap: 0.5rem;
      padding: 0.75rem;
    }

    .control-group {
      width: 100%;
      justify-content: center;
    }

    .theme-btn, .sidebar-btn {
      flex: 1;
      justify-content: center;
      padding: 0.75rem;
    }

    .theme-text, .sidebar-text {
      display: none;
    }
  }

  :global(.dark) .theme-controls {
    background: rgba(0, 0, 0, 0.3);
    border-color: rgba(255, 255, 255, 0.1);
  }

  :global(.dark) .theme-btn, 
  :global(.dark) .sidebar-btn {
    border-color: rgba(255, 255, 255, 0.2);
    background: rgba(255, 255, 255, 0.05);
  }

  :global(.dark) .theme-btn:hover, 
  :global(.dark) .sidebar-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.3);
  }

  :global(.dark) .sidebar-btn.active {
    background: rgba(0, 123, 255, 0.3);
    border-color: rgba(0, 123, 255, 0.5);
  }
</style>