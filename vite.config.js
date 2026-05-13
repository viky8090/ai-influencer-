import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/hf': {
        target: 'https://mcp.higgsfield.ai',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api\/hf/, ''),
      },
    },
  },
})
