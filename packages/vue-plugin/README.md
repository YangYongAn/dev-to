# @dev-to/vue-plugin

Vite plugin that exposes DevTo bridge endpoints for Vue component development.

## Usage

```ts
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
      MyCard: 'src/components/MyCard.vue',
    }),
  ],
})
```
