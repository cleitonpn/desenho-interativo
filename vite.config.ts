import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// BASE_PATH permite publicar tanto no GitHub Pages (subpasta do repo)
// quanto no Firebase Hosting (raiz). O workflow define a variavel.
export default defineConfig({
  plugins: [react()],
  base: process.env.BASE_PATH ?? '/',
})
