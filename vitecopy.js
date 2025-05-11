/*import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    
  },
});
*/
/*
import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import path from 'path';

export default defineConfig({
  plugins: [preact()],
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/main.jsx'),
      name: 'JSONEditorWidget',
      fileName: 'json-editor-widget',
      formats: ['iife'],
    },
    rollupOptions: {
      external: [],
    },
    cssCodeSplit: true, // включить CSS внутрь JS-бандла
  },
  resolve: {
    alias: {
      react: 'preact/compat',
      'react-dom': 'preact/compat',
    },
  },
});

*/


/*
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.NODE_ENV': '"production"',
  },
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.js'),
      name: 'JsonEditorWidget', // это имя появится в window.JsonEditorWidget
      fileName: (format) => `json-editor-widget.${format}.js`,
      formats: ['umd'], // только UMD нужен для <script> подключения
    },
    rollupOptions: {
          
    },
  },
});
*/

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
        //assetFileNames: 'style.css',
      },
    },
    cssCodeSplit: true,
  },
})
