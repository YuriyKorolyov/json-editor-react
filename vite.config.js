import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'

export default defineConfig({
  plugins: [preact()],
  build: {
    outDir: 'dist/widget',
    emptyOutDir: true,
    lib: {
      entry: 'src/main.jsx',   // ваш главный файл
      name: 'JsonEditorWidget',
      fileName: () => 'bundle_ru.js',
      formats: ['iife'],
    },
    rollupOptions: {
      output: {
      
      },
    },
    cssCodeSplit: true,
  },
})
