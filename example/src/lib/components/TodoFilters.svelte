<script lang="ts">
  interface Props {
    currentFilter: 'all' | 'active' | 'completed';
    onSetFilter: (filter: 'all' | 'active' | 'completed') => void;
    onRefresh: () => void;
  }

  let { currentFilter, onSetFilter, onRefresh }: Props = $props();

  const filters = [
    { key: 'all' as const, label: 'All', icon: '📋' },
    { key: 'active' as const, label: 'Active', icon: '⏳' },
    { key: 'completed' as const, label: 'Completed', icon: '✅' }
  ];
</script>

<div class="todo-filters">
  <div class="filter-buttons">
    {#each filters as filter}
      <button
        class="filter-btn"
        class:active={currentFilter === filter.key}
        onclick={() => onSetFilter(filter.key)}
      >
        <span class="filter-icon">{filter.icon}</span>
        <span class="filter-label">{filter.label}</span>
      </button>
    {/each}
  </div>
  
  <div class="filter-actions">
    <button onclick={onRefresh} class="refresh-btn" title="Refresh todos">
      <span class="refresh-icon">🔄</span>
      <span>Refresh</span>
    </button>
  </div>
</div>

<style>
  .todo-filters {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin: 1rem 0;
    padding: 1rem;
    background: #f8f9fa;
    border-radius: 8px;
    border: 1px solid #e9ecef;
  }

  .filter-buttons {
    display: flex;
    gap: 0.5rem;
  }

  .filter-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border: 1px solid #dee2e6;
    background: white;
    color: #495057;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.9rem;
    transition: all 0.2s ease;
    position: relative;
  }

  .filter-btn:hover {
    background: #e9ecef;
    border-color: #adb5bd;
  }

  .filter-btn.active {
    background: #007bff;
    color: white;
    border-color: #007bff;
    box-shadow: 0 2px 4px rgba(0,123,255,0.25);
  }

  .filter-btn.active:hover {
    background: #0056b3;
    border-color: #0056b3;
  }

  .filter-icon {
    font-size: 1rem;
  }

  .filter-label {
    font-weight: 500;
  }

  .filter-actions {
    display: flex;
    gap: 0.5rem;
  }

  .refresh-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border: 1px solid #28a745;
    background: #28a745;
    color: white;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.9rem;
    transition: all 0.2s ease;
  }

  .refresh-btn:hover {
    background: #218838;
    border-color: #218838;
    transform: translateY(-1px);
  }

  .refresh-btn:active .refresh-icon {
    animation: spin 0.5s ease-in-out;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .refresh-icon {
    font-size: 1rem;
    transition: transform 0.2s ease;
  }

  @media (max-width: 640px) {
    .todo-filters {
      flex-direction: column;
      gap: 1rem;
    }

    .filter-buttons {
      justify-content: center;
      flex-wrap: wrap;
    }

    .filter-btn {
      padding: 0.4rem 0.8rem;
      font-size: 0.8rem;
    }

    .refresh-btn {
      padding: 0.4rem 0.8rem;
      font-size: 0.8rem;
    }
  }

  :global(.dark) .todo-filters {
    background: #2a2a2a;
    border-color: #444;
  }

  :global(.dark) .filter-btn {
    background: #333;
    color: #ccc;
    border-color: #555;
  }

  :global(.dark) .filter-btn:hover {
    background: #404040;
    border-color: #666;
  }

  :global(.dark) .filter-btn.active {
    background: #007bff;
    border-color: #007bff;
  }

  :global(.dark) .refresh-btn {
    background: #28a745;
    border-color: #28a745;
  }

  :global(.dark) .refresh-btn:hover {
    background: #218838;
    border-color: #218838;
  }
</style>