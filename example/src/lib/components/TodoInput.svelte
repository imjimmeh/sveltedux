<script lang="ts">
  interface Props {
    onAddTodo: (text: string) => void;
  }

  let { onAddTodo }: Props = $props();
  
  let todoText = $state('');
  let inputRef: HTMLInputElement;

  function handleSubmit() {
    if (todoText.trim()) {
      onAddTodo(todoText.trim());
      todoText = '';
      inputRef?.focus();
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      handleSubmit();
    }
  }
</script>

<div class="todo-input-container">
  <div class="input-group">
    <div class="input-icon">📝</div>
    <input
      bind:this={inputRef}
      bind:value={todoText}
      onkeydown={handleKeydown}
      placeholder="What needs to be done?"
      class="todo-input"
      autocomplete="off"
    />
    <button 
      onclick={handleSubmit}
      class="add-btn"
      disabled={!todoText.trim()}
      title="Add todo"
    >
      <span class="add-icon">+</span>
      <span class="add-text">Add</span>
    </button>
  </div>
  
  {#if todoText.length > 50}
    <div class="char-counter" class:warning={todoText.length > 80}>
      {todoText.length} characters
    </div>
  {/if}
</div>

<style>
  .todo-input-container {
    margin-bottom: 1.5rem;
  }

  .input-group {
    display: flex;
    align-items: center;
    background: white;
    border: 2px solid #e9ecef;
    border-radius: 12px;
    overflow: hidden;
    transition: all 0.3s ease;
    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  }

  .input-group:focus-within {
    border-color: #007bff;
    box-shadow: 0 4px 12px rgba(0,123,255,0.15);
    transform: translateY(-1px);
  }

  .input-icon {
    padding: 1rem;
    font-size: 1.2rem;
    color: #6c757d;
    background: #f8f9fa;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .todo-input {
    flex: 1;
    padding: 1rem;
    border: none;
    outline: none;
    font-size: 1rem;
    background: transparent;
    color: #495057;
  }

  .todo-input::placeholder {
    color: #adb5bd;
    font-style: italic;
  }

  .add-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 1rem 1.5rem;
    background: #007bff;
    color: white;
    border: none;
    cursor: pointer;
    font-size: 1rem;
    font-weight: 500;
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
  }

  .add-btn:disabled {
    background: #6c757d;
    cursor: not-allowed;
    opacity: 0.6;
  }

  .add-btn:not(:disabled):hover {
    background: #0056b3;
    transform: scale(1.02);
  }

  .add-btn:not(:disabled):active {
    transform: scale(0.98);
  }

  .add-btn::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    background: rgba(255,255,255,0.2);
    border-radius: 50%;
    transition: all 0.3s ease;
    transform: translate(-50%, -50%);
  }

  .add-btn:not(:disabled):active::before {
    width: 300px;
    height: 300px;
  }

  .add-icon {
    font-size: 1.2rem;
    font-weight: bold;
    line-height: 1;
  }

  .add-text {
    font-weight: 600;
  }

  .char-counter {
    margin-top: 0.5rem;
    text-align: right;
    font-size: 0.8rem;
    color: #6c757d;
    padding: 0 0.5rem;
  }

  .char-counter.warning {
    color: #dc3545;
    font-weight: 500;
  }

  @media (max-width: 640px) {
    .input-group {
      border-radius: 8px;
    }

    .input-icon {
      padding: 0.75rem;
    }

    .todo-input {
      padding: 0.75rem;
      font-size: 0.9rem;
    }

    .add-btn {
      padding: 0.75rem 1rem;
      font-size: 0.9rem;
    }

    .add-text {
      display: none;
    }
  }

  :global(.dark) .input-group {
    background: #333;
    border-color: #555;
  }

  :global(.dark) .input-group:focus-within {
    border-color: #007bff;
    box-shadow: 0 4px 12px rgba(0,123,255,0.25);
  }

  :global(.dark) .input-icon {
    background: #2a2a2a;
    color: #ccc;
  }

  :global(.dark) .todo-input {
    color: #fff;
  }

  :global(.dark) .todo-input::placeholder {
    color: #999;
  }

  :global(.dark) .char-counter {
    color: #ccc;
  }

  :global(.dark) .char-counter.warning {
    color: #ff6b6b;
  }
</style>