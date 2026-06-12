import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages serves from /yicheng/
export default defineConfig({
  base: '/yicheng/',
  plugins: [react()],
})
