import JsonEditor from './components/JE';
import { h, render } from 'preact';

window.__jivoBundleOnLoad = function(callback) {
  const bundleCode = `
    (function() {
      // 1. Создаем корневой элемент
      const root = document.createElement('div');
      root.id = 'json-editor-root';
      
      // 2. Добавляем в родительский документ
      parent.document.body.appendChild(root);

      // 3. Используем глобальные зависимости
      const { h, render } = parent.preact;
      const JsonEditor = parent.JsonEditor;
      
      // 4. Рендеринг компонента
      const editorInstance = render(h(JsonEditor, {}), root);    
    })();
  `;
  callback(bundleCode);
};

// Экспортируем зависимости
window.JsonEditor = JsonEditor;
window.preact = { h, render };