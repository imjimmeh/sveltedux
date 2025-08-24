<script lang="ts">
  interface TodoStats {
    total: number;
    completed: number;
    active: number;
  }

  interface Props {
    stats: TodoStats;
  }

  let { stats }: Props = $props();

  const completionPercentage = $derived(
    stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0
  );

  const progressColor = $derived(
    completionPercentage >= 100 ? '#28a745' :
    completionPercentage >= 75 ? '#17a2b8' :
    completionPercentage >= 50 ? '#ffc107' :
    completionPercentage >= 25 ? '#fd7e14' : '#dc3545'
  );
</script>

<div class="todo-stats">
  <h3>📊 Statistics</h3>
  
  <div class="stats-grid">
    <div class="stat-card total">
      <div class="stat-icon">📋</div>
      <div class="stat-content">
        <div class="stat-number">{stats.total}</div>
        <div class="stat-label">Total</div>
      </div>
    </div>
    
    <div class="stat-card active">
      <div class="stat-icon">⏳</div>
      <div class="stat-content">
        <div class="stat-number">{stats.active}</div>
        <div class="stat-label">Active</div>
      </div>
    </div>
    
    <div class="stat-card completed">
      <div class="stat-icon">✅</div>
      <div class="stat-content">
        <div class="stat-number">{stats.completed}</div>
        <div class="stat-label">Done</div>
      </div>
    </div>
  </div>

  <div class="progress-section">
    <div class="progress-header">
      <span class="progress-label">Progress</span>
      <span class="progress-percentage">{completionPercentage}%</span>
    </div>
    
    <div class="progress-bar">
      <div 
        class="progress-fill" 
        style="width: {completionPercentage}%; background-color: {progressColor};"
      ></div>
    </div>
    
    <div class="progress-text">
      {#if stats.total === 0}
        No todos yet - add some to get started! 🚀
      {:else if completionPercentage === 100}
        All done! Great job! 🎉
      {:else if completionPercentage >= 75}
        Almost there! Keep it up! 💪
      {:else if completionPercentage >= 50}
        Halfway done! You're doing great! 👍
      {:else if completionPercentage >= 25}
        Good start! Keep going! 📈
      {:else}
        Just getting started! 🌱
      {/if}
    </div>
  </div>
</div>

<style>
  .todo-stats {
    padding: 1.5rem;
    background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
    border-radius: 12px;
    border: 1px solid #dee2e6;
    margin-bottom: 1rem;
  }

  .todo-stats h3 {
    margin-top: 0;
    margin-bottom: 1.5rem;
    color: #495057;
    font-size: 1.1rem;
    text-align: center;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .stat-card {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem;
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }

  .stat-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
  }

  .stat-icon {
    font-size: 1.5rem;
    opacity: 0.8;
  }

  .stat-content {
    flex: 1;
  }

  .stat-number {
    font-size: 1.5rem;
    font-weight: bold;
    line-height: 1;
    margin-bottom: 0.25rem;
  }

  .stat-label {
    font-size: 0.8rem;
    color: #6c757d;
    text-transform: uppercase;
    font-weight: 500;
    letter-spacing: 0.5px;
  }

  .stat-card.total .stat-number { color: #495057; }
  .stat-card.active .stat-number { color: #fd7e14; }
  .stat-card.completed .stat-number { color: #28a745; }

  .progress-section {
    margin-top: 1.5rem;
  }

  .progress-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .progress-label {
    font-weight: 500;
    color: #495057;
  }

  .progress-percentage {
    font-weight: bold;
    font-size: 0.9rem;
  }

  .progress-bar {
    height: 8px;
    background: #e9ecef;
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 0.75rem;
  }

  .progress-fill {
    height: 100%;
    transition: width 0.3s ease, background-color 0.3s ease;
    border-radius: 4px;
  }

  .progress-text {
    text-align: center;
    font-size: 0.85rem;
    color: #6c757d;
    font-style: italic;
    padding: 0.5rem;
    background: rgba(255,255,255,0.5);
    border-radius: 6px;
  }

  @media (max-width: 640px) {
    .stats-grid {
      grid-template-columns: 1fr;
      gap: 0.75rem;
    }
    
    .stat-card {
      padding: 0.75rem;
    }
    
    .todo-stats {
      padding: 1rem;
    }
  }

  :global(.dark) .todo-stats {
    background: linear-gradient(135deg, #2a2a2a 0%, #1e1e1e 100%);
    border-color: #444;
  }

  :global(.dark) .todo-stats h3 {
    color: #fff;
  }

  :global(.dark) .stat-card {
    background: #333;
    color: #fff;
  }

  :global(.dark) .stat-label {
    color: #ccc;
  }

  :global(.dark) .progress-label {
    color: #fff;
  }

  :global(.dark) .progress-bar {
    background: #444;
  }

  :global(.dark) .progress-text {
    color: #ccc;
    background: rgba(0,0,0,0.2);
  }
</style>