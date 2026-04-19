import axios from 'axios'
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { todosApi, type Todo, type TodoCreate, type TodoUpdate } from '../api/todos'
import { idbStorage } from '../lib/storage'

// Локальный (оптимистичный) элемент: id может быть временным строковым,
// пока запрос на создание не завершился успехом.
export type LocalTodo = Omit<Todo, 'id'> & { id: number | string }

const isTempId = (id: number | string): id is string =>
  typeof id === 'string' && id.startsWith('tmp-')

// Очередь отложенных операций для оффлайна.
// Хранится вместе со стором в IndexedDB, поэтому переживает перезагрузку.
type PendingOp =
  | { kind: 'create'; tempId: string; payload: TodoCreate }
  | { kind: 'update'; targetId: number | string; payload: TodoUpdate }
  | { kind: 'delete'; targetId: number | string }

function isNetworkError(e: unknown): boolean {
  if (axios.isAxiosError(e)) {
    // Нет ответа от сервера = проблема с сетью / сервер недоступен.
    return !e.response
  }
  return false
}

export const useTodosStore = defineStore(
  'todos',
  () => {
    const items = ref<LocalTodo[]>([])
    const queue = ref<PendingOp[]>([])
    const loading = ref(false)
    const syncing = ref(false)
    const isOnline = ref(
      typeof navigator !== 'undefined' ? navigator.onLine : true,
    )
    const error = ref<string | null>(null)

    const count = computed(() => items.value.length)
    const pendingCount = computed(() => queue.value.length)

    function setError(e: unknown) {
      // Сетевые ошибки — это не ошибки для пользователя, мы просто ждём online.
      if (isNetworkError(e)) return
      if (axios.isAxiosError(e) && e.response) {
        error.value = `Ошибка ${e.response.status}: ${e.response.statusText}`
      } else if (e instanceof Error) {
        error.value = e.message
      } else {
        error.value = 'Не удалось выполнить запрос'
      }
    }

    function clearError() {
      error.value = null
    }

    /**
     * Последовательно отправляет операции из очереди.
     * При сетевой ошибке — останавливается, помечает offline и ждёт события 'online'.
     * При прикладной ошибке (4xx/5xx с ответом) — выкидывает операцию и показывает ошибку.
     */
    async function flush() {
      if (syncing.value) return
      if (!isOnline.value) return
      if (queue.value.length === 0) return

      syncing.value = true
      try {
        while (queue.value.length > 0) {
          const op = queue.value[0]!
          try {
            if (op.kind === 'create') {
              const created = await todosApi.create(op.payload)
              const idx = items.value.findIndex((t) => t.id === op.tempId)
              if (idx !== -1) items.value[idx] = created
              // Перепривязываем последующие операции с временного id на реальный.
              for (let i = 1; i < queue.value.length; i++) {
                const next = queue.value[i]!
                if (
                  (next.kind === 'update' || next.kind === 'delete') &&
                  next.targetId === op.tempId
                ) {
                  next.targetId = created.id
                }
              }
            } else if (op.kind === 'update') {
              if (typeof op.targetId !== 'number') {
                // Запись ещё не создана — отложим (на практике сюда не попадаем,
                // потому что create обрабатывается раньше в FIFO).
                break
              }
              const updated = await todosApi.update(op.targetId, op.payload)
              const i = items.value.findIndex((t) => t.id === op.targetId)
              if (i !== -1) items.value[i] = updated
            } else if (op.kind === 'delete') {
              if (typeof op.targetId === 'number') {
                await todosApi.remove(op.targetId)
              }
              // если targetId всё ещё временный — удалять на сервере нечего
            }
            queue.value.shift()
          } catch (e) {
            if (isNetworkError(e)) {
              isOnline.value = false
              break
            }
            // Прикладная ошибка — выкидываем операцию, чтобы не залипать.
            queue.value.shift()
            setError(e)
          }
        }
      } finally {
        syncing.value = false
      }
    }

    /**
     * Подгружает данные с сервера. На сетевой ошибке тихо остаётся
     * с тем, что лежит в IndexedDB (через persistedstate) или в Workbox-кэше.
     */
    async function fetchAll() {
      loading.value = true
      try {
        const data = await todosApi.list()
        // Сохраняем элементы, которые ещё не успели создаться на сервере.
        const pending = items.value.filter((t) => isTempId(t.id))
        items.value = [...data, ...pending]
        clearError()
      } catch (e) {
        if (!isNetworkError(e)) setError(e)
      } finally {
        loading.value = false
      }
    }

    function addTodo(text: string) {
      const trimmed = text.trim()
      if (!trimmed) return
      const tempId = `tmp-${crypto.randomUUID()}`
      items.value.push({ id: tempId, text: trimmed, is_completed: false })
      queue.value.push({
        kind: 'create',
        tempId,
        payload: { text: trimmed, is_completed: false },
      })
      void flush()
    }

    function updateTodo(id: number | string, patch: TodoUpdate) {
      const item = items.value.find((t) => t.id === id)
      if (!item) return
      Object.assign(item, patch)
      queue.value.push({ kind: 'update', targetId: id, payload: patch })
      void flush()
    }

    function removeTodo(id: number | string) {
      const idx = items.value.findIndex((t) => t.id === id)
      if (idx === -1) return
      items.value.splice(idx, 1)
      queue.value.push({ kind: 'delete', targetId: id })
      void flush()
    }

    /**
     * Подписывается на online/offline события и пытается слить очередь
     * сразу при появлении сети. Вызывать один раз из main.ts.
     */
    function initNetworkSync() {
      if (typeof window === 'undefined') return
      window.addEventListener('online', () => {
        isOnline.value = true
        clearError()
        void flush().then(() => fetchAll())
      })
      window.addEventListener('offline', () => {
        isOnline.value = false
      })
      // На старте: попытаться слить накопленные офлайн-изменения и подтянуть свежее.
      void flush().then(() => fetchAll())
    }

    return {
      items,
      queue,
      loading,
      syncing,
      isOnline,
      error,
      count,
      pendingCount,
      fetchAll,
      addTodo,
      updateTodo,
      removeTodo,
      flush,
      clearError,
      initNetworkSync,
    }
  },
  {
    // Pinia Plugin Persistedstate поверх IndexedDB через localforage.
    // Сохраняем и список задач, и очередь — чтобы пережить перезагрузку оффлайн.
    persist: {
      key: 'todos',
      storage: idbStorage,
      pick: ['items', 'queue'],
    },
  },
)
