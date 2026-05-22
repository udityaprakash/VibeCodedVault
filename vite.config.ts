import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  // In packaged Electron we load `file://.../dist/index.html`.
  // Vite's default absolute asset paths (`/assets/...`) break there and cause a blank window.
  base: './',
  plugins: [
    react(),
    tailwindcss(),
  ],
})
