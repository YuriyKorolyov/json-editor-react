import React from 'react';
import JsonEditor from '../components/JE';
import './App.css'; // Создайте этот файл для стилей
//import JsonEditor from '../components/JsonEditor';
//import { EditorPage } from '../pages/editor/ui/EditorPage';

const App = () => {
  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Редактор JSON-объектов</h1>
        <p className="app-description">
          Создавайте, редактируйте и валидируйте JSON-данные с поддержкой схем
        </p>
      </header>
      
      <main className="app-main">
        <JsonEditor />
      </main>
      
      <footer className="app-footer">
        <p>© {new Date().getFullYear()} JSON Editor</p>
      </footer>
    </div>
  );
};

export default App;