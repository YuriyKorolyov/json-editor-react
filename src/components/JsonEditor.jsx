import React, { useState, useRef, useEffect } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { json } from "@codemirror/lang-json";
import { createTheme } from "@uiw/codemirror-themes";
import { tags as t } from "@lezer/highlight";
import { history, undo, redo, historyKeymap } from "@codemirror/commands";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import { keymap } from "@codemirror/view";

const vscodeDarkModern = createTheme({
  theme: "dark",
  settings: {
    background: "#1e1e1e",
    foreground: "#d4d4d4",
    caret: "#ffffff",
    selection: "#264f78",
    lineHighlight: "#2a2d2e",
    gutterBackground: "#1e1e1e",
    gutterForeground: "#858585",
  },
  styles: [
    { tag: t.propertyName, color: "#9cdcfe" },
    { tag: t.string, color: "#ce9178" },
    { tag: t.number, color: "#b5cea8" },
    { tag: t.bool, color: "#569cd6" },
    { tag: t.null, color: "#569cd6" },
    { tag: t.keyword, color: "#c586c0" },
  ],
});

const JsonEditor = () => {
  const [value, setValue] = useState(() => {
    const savedValue = localStorage.getItem("jsonEditorContent");
    return savedValue ? savedValue : `{}`;
  });

  const [message, setMessage] = useState("");
  const [schemas, setSchemas] = useState(() => {
    return JSON.parse(localStorage.getItem("schemas")) || [];
  });

  const [schemaName, setSchemaName] = useState("");
  const [fields, setFields] = useState([]);
  const [selectedSchema, setSelectedSchema] = useState(null);
  const editorRef = useRef(null);

  // Автосохранение в localStorage при каждом изменении
  useEffect(() => {
    localStorage.setItem("jsonEditorContent", value);
  }, [value]);

  useEffect(() => {
    try {
      JSON.parse(value);
      setMessage({ text: "Корректный JSON!", type: "success" });
    } catch (error) {
      setMessage({ text: `Некорректный JSON: ${error.message}`, type: "error" });
    }
  }, [value]);

  const handleFormat = () => {
    try {
      const formatted = JSON.stringify(JSON.parse(value), null, 2);
      setValue(formatted);
      setMessage({ text: "JSON отформатирован успешно!", type: "success" });
    } catch (error) {
      setMessage({ text: `Ошибка форматирования JSON: ${error.message}`, type: "error" });
    }
  };

  const handleClear = () => {
    setValue("{}");
    setMessage("");
  };

  const handleUndo = () => {
    if (editorRef.current?.view) undo(editorRef.current.view);
  };

  const handleRedo = () => {
    if (editorRef.current?.view) redo(editorRef.current.view);
  };

  const handleAddField = () => {
    setFields([...fields, { name: "", type: "string" }]);
  };

  const handleFieldChange = (index, key, value) => {
    const updatedFields = [...fields];
    updatedFields[index][key] = value;
    setFields(updatedFields);
  };

  const handleSaveSchema = () => {
    if (!schemaName.trim()) return;
    const newSchema = { name: schemaName, fields };
    const updatedSchemas = [...schemas, newSchema];
    setSchemas(updatedSchemas);
    localStorage.setItem("schemas", JSON.stringify(updatedSchemas));
    setSchemaName("");
    setFields([]);
  };

  const handleInsertSchema = () => {
    if (!selectedSchema) return;
    const schema = schemas.find((s) => s.name === selectedSchema);
    if (!schema) return;

    const defaultJson = {};
    schema.fields.forEach((field) => {
      switch (field.type) {
        case "string":
          defaultJson[field.name] = "";
          break;
        case "number":
          defaultJson[field.name] = 0;
          break;
        case "boolean":
          defaultJson[field.name] = false;
          break;
        case "object":
          defaultJson[field.name] = {};
          break;
        case "array":
          defaultJson[field.name] = [];
          break;
        default:
          defaultJson[field.name] = null;
      }
    });

    setValue(JSON.stringify(defaultJson, null, 2));
  };

  const extensions = [
    json(),
    history(),
    keymap.of([...historyKeymap, ...searchKeymap]),
    highlightSelectionMatches(),
  ];

  return (
    <div>
      <h3>Редактор JSON</h3>
      <CodeMirror value={value} height="300px" theme={vscodeDarkModern} extensions={extensions} onChange={setValue} ref={editorRef} />
      
      <div className="buttons">
        <button onClick={handleFormat}>Формат JSON</button>
        <button onClick={handleClear}>Очистить</button>
        <button onClick={handleUndo}>Undo (Ctrl+Z)</button>
        <button onClick={handleRedo}>Redo (Ctrl+Y)</button>
      </div>

      {message && <div className={`message ${message.type}`}>{message.text}</div>}

      <h3>Создание схемы</h3>
      <input type="text" placeholder="Название схемы" value={schemaName} onChange={(e) => setSchemaName(e.target.value)} />
      <button onClick={handleAddField}>Добавить поле</button>
      {fields.map((field, index) => (
        <div key={index}>
          <input type="text" placeholder="Имя поля" value={field.name} onChange={(e) => handleFieldChange(index, "name", e.target.value)} />
          <select value={field.type} onChange={(e) => handleFieldChange(index, "type", e.target.value)}>
            <option value="string">String</option>
            <option value="number">Number</option>
            <option value="boolean">Boolean</option>
            <option value="object">Object</option>
            <option value="array">Array</option>
          </select>
        </div>
      ))}
      <button onClick={handleSaveSchema}>Сохранить схему</button>

      <h3>Выбор схемы</h3>
      <select onChange={(e) => setSelectedSchema(e.target.value)}>
        <option value="">Выберите схему</option>
        {schemas.map((schema, index) => (
          <option key={index} value={schema.name}>
            {schema.name}
          </option>
        ))}
      </select>
      <button onClick={handleInsertSchema}>Вставить схему</button>
    </div>
  );
};

export default JsonEditor;
