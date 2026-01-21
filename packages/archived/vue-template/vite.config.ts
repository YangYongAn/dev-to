import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { devToVuePlugin } from '@dev-to/vue-plugin'

export default defineConfig({
  server: {
    port: 5173,
    cors: true,
  },
  plugins: [
    vue(),
    devToVuePlugin({
      RemoteCard: 'src/RemoteCard/index.vue',
    }),
  ],
})
