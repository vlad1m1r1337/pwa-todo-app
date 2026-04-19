<script setup lang="ts">
import { ref, computed } from 'vue'
import PWABadge from './components/PWABadge.vue'

type Todo = { id: string; title: string; is_completed: boolean }

const STORAGE_KEY = 'pwa-test-todos'

function loadTodos(): Todo[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (t): t is Todo =>
        t &&
        typeof t === 'object' &&
        typeof (t as Todo).id === 'string' &&
        typeof (t as Todo).title === 'string',
    )
  } catch {
    return []
  }
}

const todos = ref<Todo[]>(loadTodos())
const draft = ref('')
const editingId = ref<string | null>(null)
const editText = ref('')

const canAdd = computed(() => draft.value.trim().length > 0)

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos.value))
}

function addTodo() {
  const title = draft.value.trim()
  if (!title) return
  todos.value.push({ id: crypto.randomUUID(), title, is_completed: false })
  draft.value = ''
  persist()
}

function removeTodo(id: string) {
  todos.value = todos.value.filter((t) => t.id !== id)
  if (editingId.value === id) cancelEdit()
  persist()
}

function startEdit(todo: Todo) {
  editingId.value = todo.id
  editText.value = todo.title
}

function saveEdit() {
  if (!editingId.value) return
  const title = editText.value.trim()
  if (!title) return
  const t = todos.value.find((x) => x.id === editingId.value)
  if (t) t.title = title
  editingId.value = null
  persist()
}

function cancelEdit() {
  editingId.value = null
  editText.value = ''
}

function onEditKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    e.preventDefault()
    saveEdit()
  }
  if (e.key === 'Escape') cancelEdit()
}
</script>

<template>
  <div class="app">
    <header class="head">
      <h1 class="title">Задачи</h1>
      <p class="sub">Добавляйте, редактируйте и удаляйте дела</p>
    </header>

    <form class="add" @submit.prevent="addTodo">
      <input
        v-model="draft"
        class="input"
        type="text"
        autocomplete="off"
        placeholder="Новое дело…"
        aria-label="Текст новой задачи"
      />
      <button type="submit" class="btn primary" :disabled="!canAdd">Добавить</button>
    </form>

    <ul class="list" aria-label="Список задач">
      <li v-for="todo in todos" :key="todo.id" class="row">
        <template v-if="editingId === todo.id">
          <input
            v-model="editText"
            class="input grow"
            type="text"
            aria-label="Редактирование задачи"
            @keydown="onEditKeydown"
          />
          <input
            class="checkbox"
            type="checkbox"
            v-model="todo.is_completed"
            aria-label="Выполнено"
          />
          <div class="actions">
            <button type="button" class="btn" @click="saveEdit">Сохранить</button>
            <button type="button" class="btn ghost" @click="cancelEdit">Отмена</button>
          </div>
        </template>
        <template v-else>
          <span class="text">{{ todo.title }}</span>
          <input
            class="checkbox"
            type="checkbox"
            v-model="todo.is_completed"
            aria-label="Выполнено"
          />
          <div class="actions">
            <button type="button" class="btn" @click="startEdit(todo)">Изменить</button>
            <button type="button" class="btn danger" @click="removeTodo(todo.id)">Удалить</button>
          </div>
        </template>
      </li>
    </ul>

    <p v-if="todos.length === 0" class="empty">Пока нет задач</p>

    <PWABadge />
  </div>
</template>

<style scoped>
.app {
  width: min(100%, 28rem);
  margin: 0 auto;
  text-align: left;
}

.head {
  margin-bottom: 1.25rem;
}

.title {
  margin: 0;
  font-size: 1.35rem;
  font-weight: 600;
  letter-spacing: -0.02em;
}

.sub {
  margin: 0.35rem 0 0;
  font-size: 0.875rem;
  opacity: 0.65;
}

.add {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.input {
  flex: 1;
  min-width: 0;
  padding: 0.5rem 0.65rem;
  border: 1px solid var(--border);
  border-radius: 6px;
  font: inherit;
  background: var(--surface);
  color: inherit;
}

.input:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 25%, transparent);
}

.input.grow {
  flex: 1;
}

.checkbox {
  flex: 0 0 auto;
  width: 1.125rem;
  height: 1.125rem;
  margin: 0;
  cursor: pointer;
  vertical-align: middle;
  border-radius: 4px;
  border: 1px solid var(--border);
  background: var(--surface);
  accent-color: var(--accent);
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.checkbox:hover {
  border-color: color-mix(in srgb, var(--accent) 35%, var(--border));
}

.checkbox:focus {
  outline: none;
}

.checkbox:focus-visible {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 25%, transparent);
}

.btn {
  padding: 0.5rem 0.65rem;
  border: 1px solid var(--border);
  border-radius: 6px;
  font: inherit;
  font-size: 0.8125rem;
  background: var(--surface-2);
  color: inherit;
  cursor: pointer;
  white-space: nowrap;
}

.btn:hover:not(:disabled) {
  border-color: var(--accent);
}

.btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.btn.primary {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--on-accent);
}

.btn.primary:hover:not(:disabled) {
  filter: brightness(1.05);
}

.btn.danger {
  border-color: color-mix(in srgb, var(--danger) 45%, var(--border));
  color: var(--danger);
  background: transparent;
}

.btn.danger:hover:not(:disabled) {
  border-color: var(--danger);
  background: color-mix(in srgb, var(--danger) 8%, transparent);
}

.btn.ghost {
  background: transparent;
}

.list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  padding: 0.6rem 0.65rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
}

.text {
  flex: 1;
  min-width: 0;
  word-break: break-word;
  font-size: 0.9375rem;
  line-height: 1.4;
}

.actions {
  display: flex;
  gap: 0.35rem;
  flex-shrink: 0;
}

.empty {
  margin: 0.75rem 0 0;
  font-size: 0.875rem;
  opacity: 0.55;
  text-align: center;
}
</style>
