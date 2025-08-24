<script lang="ts">
  import type { Todo } from '../example.js';
  import TodoItem from './TodoItem.svelte';

  interface Props {
    todos: Todo[];
    onToggleTodo: (id: number) => void;
    onRemoveTodo: (id: number) => void;
  }

  let { todos, onToggleTodo, onRemoveTodo }: Props = $props();
</script>

<div class="todo-list-container">
  {#if todos.length === 0}
    <div class="empty-state">
      <p>No todos to show</p>
      <span class="empty-icon">📝</span>
    </div>
  {:else}
    <ul class="todo-list">
      {#each todos as todo (todo.id)}
        <TodoItem 
          {todo}
          onToggle={onToggleTodo}
          onRemove={onRemoveTodo}
        />
      {/each}
    </ul>
    
    <div class="list-summary">
      <p>{todos.length} {todos.length === 1 ? 'item' : 'items'}</p>
    </div>
  {/if}
</div>

<style>
  .todo-list-container {
    margin-top: 1rem;
  }

  .todo-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .empty-state {
    text-align: center;
    padding: 3rem 1rem;
    color: #666;
    font-style: italic;
  }

  .empty-state .empty-icon {
    display: block;
    font-size: 3rem;
    margin-bottom: 1rem;
    opacity: 0.5;
  }

  .list-summary {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid #e0e0e0;
    text-align: center;
    font-size: 0.9rem;
    color: #666;
  }

  :global(.dark) .empty-state {
    color: #999;
  }

  :global(.dark) .list-summary {
    border-top-color: #555;
    color: #ccc;
  }
</style>