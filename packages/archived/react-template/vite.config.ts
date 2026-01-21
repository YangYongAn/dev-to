import { devToReactPlugin } from '@dev-to/react-plugin'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    port: 5173,
    strictPort: true,
    cors: true,
  },
  plugins: [
    react(),
    devToReactPlugin({
      RemoteCard: 'src/RemoteCard/index.tsx',
    }),
  ],
})
