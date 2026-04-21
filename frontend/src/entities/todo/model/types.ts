import type { ResourceId } from '@/shared/lib/offline'

export type Todo = {
  id: number
  text: string
  is_completed: boolean
}

export type TodoCreate = Pick<Todo, 'text' | 'is_completed'>
export type TodoUpdate = Partial<TodoCreate>

/**
 * Локальное (оптимистичное) представление: `id` может быть временной строкой,
 * пока запрос на создание не подтверждён сервером.
 */
export type LocalTodo = Omit<Todo, 'id'> & { id: ResourceId }
