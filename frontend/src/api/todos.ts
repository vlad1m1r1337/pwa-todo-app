import { api } from './client'

export type Todo = {
  id: number
  text: string
  is_completed: boolean
}

export type TodoCreate = Pick<Todo, 'text' | 'is_completed'>
export type TodoUpdate = Partial<TodoCreate>

export const todosApi = {
  list: () => api.get<Todo[]>('/todos/').then((r) => r.data),
  create: (payload: TodoCreate) =>
    api.post<Todo>('/todos/', payload).then((r) => r.data),
  update: (id: number, payload: TodoUpdate) =>
    api.patch<Todo>(`/todos/${id}/`, payload).then((r) => r.data),
  remove: (id: number) => api.delete(`/todos/${id}/`).then(() => undefined),
}
