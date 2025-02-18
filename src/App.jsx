import React from 'react';
import JsonEditor from './components/JsonEditor';

const App = () => {
  return (
    <div className="container">
      <h1>Редактор JSON-объектов</h1>
      <JsonEditor />
    </div>
  );
};

export default App;
