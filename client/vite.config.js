/*import { defineConfig } from 'vite'
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
*/

import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import path from 'path'

export default defineConfig({
  plugins: [preact()],
  build: {
    outDir: path.resolve(__dirname, '../server/public/js'), // 🆕 путь к папке сервера
    emptyOutDir: false, // чтобы не удалить server/public
    lib: {
      entry: 'src/main.jsx',
      name: 'JsonEditorWidget',
      fileName: () => 'bundle_ru.js',
      formats: ['iife'], // формат загрузчика
    },
    rollupOptions: {
      output: {
        // можно добавить globals, если будет нужно
      },
    },
    cssCodeSplit: true,
  },
})



