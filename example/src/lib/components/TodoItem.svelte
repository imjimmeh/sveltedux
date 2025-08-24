<script lang="ts">
  import type { Todo } from '../example.ts';

  interface Props {
    todo: Todo;
    onToggle: (id: number) => void;
    onRemove: (id: number) => void;
  }

  let { todo, onToggle, onRemove }: Props = $props();
</script>

<li class="todo-item" class:completed={todo.completed}>
  <label class="todo-label">
    <input
      type="checkbox"
      checked={todo.completed}
      onchange={() => onToggle(todo.id)}
      class="todo-checkbox"
    />
    <span class="todo-text" class:completed={todo.completed}>
      {todo.text}
    </span>
  </label>
  
  <div class="todo-actions">
    <button 
      onclick={() => onRemove(todo.id)}
      class="remove-btn"
      title="Remove todo"
    >
      ×
    </button>
  </div>
</li>

<style>
  .todo-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem;
    border: 1px solid #e0e0e0;
    margin-bottom: 0.5rem;
    border-radius: 6px;
    background: white;
    transition: all 0.2s ease;
  }

  .todo-item:hover {
    border-color: #bbb;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }

  .todo-item.completed {
    background: #f5f5f5;
    opacity: 0.8;
  }

  .todo-label {
    display: flex;
    align-items: center;
    flex: 1;
    cursor: pointer;
    gap: 0.75rem;
  }

  .todo-checkbox {
    width: 18px;
    height: 18px;
    cursor: pointer;
    accent-color: #1976d2;
  }

  .todo-text {
    flex: 1;
    font-size: 1rem;
    line-height: 1.4;
    word-break: break-word;
    transition: all 0.2s ease;
  }

  .todo-text.completed {
    text-decoration: line-through;
    color: #666;
  }

  .todo-actions {
    display: flex;
    gap: 0.5rem;
    margin-left: 1rem;
  }

  .remove-btn {
    width: 28px;
    height: 28px;
    border: 1px solid #dc3545;
    background: white;
    color: #dc3545;
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    font-weight: bold;
    line-height: 1;
    transition: all 0.2s ease;
  }

  .remove-btn:hover {
    background: #dc3545;
    color: white;
  }

  .remove-btn:active {
    transform: scale(0.95);
  }

  :global(.dark) .todo-item {
    background: #333;
    border-color: #555;
    color: #fff;
  }

  :global(.dark) .todo-item:hover {
    border-color: #777;
    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
  }

  :global(.dark) .todo-item.completed {
    background: #2a2a2a;
  }

  :global(.dark) .todo-text.completed {
    color: #999;
  }

  :global(.dark) .remove-btn {
    background: #333;
    border-color: #dc3545;
  }

  :global(.dark) .remove-btn:hover {
    background: #dc3545;
  }
</style>