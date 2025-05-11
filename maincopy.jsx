/*
import React from 'react';
import ReactDOM from 'react-dom/client';
//import App from './app/App';
import JsonEditor from './components/JE.jsx';
//import './components/JE.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <JsonEditor />
  </React.StrictMode>
);
*/
/*
import { h } from 'preact';  // Импортировать Preact для JSX
import { render } from 'preact';  // Импортировать рендер из Preact
import JsonEditor from './components/JE.jsx'; // Твой компонент
//import './components/JE.css';

// Рендерим компонент в root элемент
render(
  <JsonEditor />,  // JSX синтаксис по-прежнему работает
  document.getElementById('root')  // Указываем место рендеринга
);

window.JSONEditorWidget = {
  mount: (containerId) => {
    const container = document.getElementById(containerId);
    if (container) {
      render(<JsonEditor />, container);
    }
  },
};
*/
/*
import { h } from 'preact';
import { render } from 'preact';
import JsonEditor from './components/JE.jsx';
import { JsonEditorApi } from './api/JsonEditorApi';

// Инициализация редактора
const initEditor = (container) => {
  let editorInstance = null;
  
  // Рендерим компонент
  render(
    <JsonEditor ref={ref => editorInstance = ref} />,
    container || document.getElementById('root')
  );
  
  // Инициализируем API
  const api = new JsonEditorApi(editorInstance);
  
  return api;
};

// Глобальный объект для управления виджетом
window.JSONEditorWidget = {
  mount: (containerId) => {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`Container with id ${containerId} not found`);
      return null;
    }
    
    const api = initEditor(container);
    return api;
  },
  
  // API методы для быстрого доступа
  /*open: () => window.jsonEditorApi?.open(),
  close: () => window.jsonEditorApi?.close(),
  loadJson: (json) => window.jsonEditorApi?.loadJson(json),
  getJson: () => window.jsonEditorApi?.getJson()*/
/*};

// Автоматическое монтирование, если есть root элемент
if (document.getElementById('root')) {
  initEditor();
}

*/
/*
import JsonEditor from './components/JE';
import './components/JE.css';
import { render } from 'preact';

window.__jivoBundleOnLoad = function(callback) {
  callback(`
    (${function mountEditor() {
      const container = document.createElement('div');
      document.body.appendChild(container);
      render(h(JsonEditor), container);
    }}());
  `);
};
*/
/*
import { h, render } from 'preact'
import JsonEditor from './components/JE'
import './components/JE.css'

window.__jivoBundleOnLoad = function (callback) {
  const code = `
    (function(){
      var root = document.createElement('div');
      root.id = 'json-editor-root';
      document.body.appendChild(root);
      window.renderJsonEditor = function () {
        const { h, render } = window.preact;
        const Editor = window.JsonEditor;
        render(h(Editor, {}), document.getElementById('json-editor-root'));
      };
      window.renderJsonEditor();
    })();
  `;

  // Передаём строку кода загрузчику
  callback(code);
};

// Сделаем JsonEditor и Preact глобальными, чтобы iframe смог их использовать
window.JsonEditor = JsonEditor;
window.preact = { h, render };*/
/*
import JsonEditor from './components/JE';
import { h, render } from 'preact';
import './components/JE.css';

// 1. Убедимся, что компонент — это не { default: ... }
const ResolvedEditor = JsonEditor.default || JsonEditor;

// 2. Сделаем компонент и API доступными внутри iframe
window.JsonEditor = ResolvedEditor;
window.preact = { h, render };

// 3. Функция, вызываемая в iframe (отрисовка)
window.renderJsonEditor = function () {
  try {
    const existing = document.getElementById('json-editor-root');
    if (!existing) {
      const root = document.createElement('div');
      root.id = 'json-editor-root';
      document.body.appendChild(root);
      render(h(ResolvedEditor, {}), root);
    }
  } catch (err) {
    console.error('[JSON-Widget] Failed to render editor:', err);
  }
};

// 4. Функция, которую вызывает load.js
window.__jivoBundleOnLoad = function (callback) {
  const code = `
    (function(){
      if (typeof window.renderJsonEditor === 'function') {
        window.renderJsonEditor();
      } else {
        console.error('[JSON-Widget] renderJsonEditor not found');
      }
    })();
  `;
  callback(code);
};*/

/*
import JsonEditor from './components/JE';
import { h, render } from 'preact';
import './components/JE.css';

window.__jivoBundleOnLoad = function(callback) {
  const code = `
    (function(){
      const root = parent.document.createElement('div');
      root.id = 'json-editor-root';
      parent.document.body.appendChild(root);
      parent.window.renderJsonEditor();
    })();
  `;
  callback(code);
};

window.renderJsonEditor = function() {
  const { h, render } = window.preact;
  const Editor = window.JsonEditor;
  render(h(Editor, {}), document.getElementById('json-editor-root'));
};

window.preact = { h, render };
window.JsonEditor = JsonEditor;*/
/*
import JsonEditor from './components/JE';
import { h, render } from 'preact';
import './components/JE.css';

// Аналог Jivo бандла - код будет выполняться в iframe
window.__jivoBundleOnLoad = function(callback) {
  const bundleCode = `
    (function() {
      // 1. Создаем корневой элемент в родительском документе
      const root = parent.document.createElement('div');
      root.id = 'json-editor-root';
      
      // 2. Добавляем стили для изоляции
      //root.style.position = 'fixed';
      //root.style.bottom = '20px';
      //root.style.right = '20px';
      //root.style.zIndex = '10000';
      
      parent.document.body.appendChild(root);

      // 3. Экспортируем функцию рендеринга в глобальную область видимости родителя
      parent.window.renderJsonEditor = function() {
        const { h, render } = parent.window.preact;
        const Editor = parent.window.JsonEditor;
        render(h(Editor, {}), parent.document.getElementById('json-editor-root'));
      };

      // 4. Инициализируем редактор сразу
      parent.window.renderJsonEditor();
    })();
  `;
  callback(bundleCode);
};

// Экспортируем компонент в глобальную область видимости
window.JsonEditor = JsonEditor;
window.preact = { h, render };
*/
//////////////////////////////////////////////////////////////////
/*
import JsonEditor from './components/JE';
import { h, render } from 'preact';
import './components/JE.css';
import { JsonEditorApi } from './api/JsonEditorApi';

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
      render(h(JsonEditor, {}), root);
    })();
  `;
  callback(bundleCode);
};

// Экспортируем зависимости
window.JsonEditor = JsonEditor;
window.preact = { h, render };*/

/*
import { h, render, createRef } from 'preact';
import JsonEditor from './components/JE.jsx';
import { JsonEditorApi } from './api/JsonEditorApi';

// Создаем глобальный API хелпер
window.setupJsonEditor = (elementId = 'json-editor-root') => {
  const root = document.createElement('div');
  root.id = elementId;
  document.body.appendChild(root);
  
  const editorRef = createRef();
  render(h(JsonEditor, { ref: editorRef }), root);
  
  // Создаем и возвращаем экземпляр API
  const api = new JsonEditorApi(editorRef);
  window.jsonEditorApi = api;
  return api;
};

window.__jivoBundleOnLoad = function(callback) {
  const bundleCode = `
    (function() {
      // Используем глобальную функцию для инициализации
      parent.setupJsonEditor('json-editor-iframe');
      console.log('JSON Editor initialized with API');
    })();
  `;
  callback(bundleCode);
};

// Экспортируем зависимости
window.JsonEditor = JsonEditor;
window.JsonEditorApi = JsonEditorApi;
window.preact = { h, render, createRef };

// Инициализируем редактор в основном окне автоматически
window.setupJsonEditor();*/

import { h, render, createRef } from 'preact';
import JsonEditor from './components/JE.jsx';
import './components/JE.css';
import { JsonEditorApi } from './api/JsonEditorApi';

// Глобальная функция инициализации
window.initJsonEditor = (targetElement = document.body) => {
  const container = document.createElement('div');
  container.id = 'json-editor-container';
  targetElement.appendChild(container);

  const editorRef = createRef();
  render(<JsonEditor ref={editorRef} />, container);

  return editorRef.current;
};

// Автоматическая инициализация при загрузке
window.addEventListener('DOMContentLoaded', () => {
  window.initJsonEditor();
});

// Для iframe (если скрипт грузится в iframe)
window.__jivoBundleOnLoad = function(callback) {
  const bundleCode = `
    (function() {
      const root = document.createElement('div');
      root.id = 'json-editor-root';
      document.body.appendChild(root);
      
      const { h, render, createRef } = window.parent.preact;
      const JsonEditor = window.parent.JsonEditor;
      
      const editorRef = createRef();
      render(h(JsonEditor, { ref: editorRef }), root);
      
      console.log('JSON Editor initialized. Use window.jsonEditorApi');
    })();
  `;
  callback(bundleCode);
};

// Экспортируем зависимости для iframe
window.JsonEditor = JsonEditor;
window.preact = { h, render, createRef };