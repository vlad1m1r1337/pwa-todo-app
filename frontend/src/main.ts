import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import './style.css'
import App from './App.vue'
import { useTodosStore } from './stores/todos'
import { preloadPersistedState } from './lib/storage'

async function bootstrap() {
  // Сначала достаём persisted state из IndexedDB в sync-кэш,
  // чтобы pinia-plugin-persistedstate увидел его при гидрации.
  await preloadPersistedState()

  const pinia = createPinia()
  pinia.use(piniaPluginPersistedstate)

  const app = createApp(App)
  app.use(pinia)
  app.mount('#app')

  // Запускаем sync-логику стора: подписки на online/offline и flush очереди.
  useTodosStore().initNetworkSync()
}

void bootstrap()
