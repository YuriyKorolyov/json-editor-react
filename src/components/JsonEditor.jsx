import React, { useState, useRef, useEffect } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { json } from "@codemirror/lang-json";
import { createTheme } from "@uiw/codemirror-themes";
import { tags as t } from "@lezer/highlight";
import { history, undo, redo, historyKeymap } from "@codemirror/commands";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import { keymap } from "@codemirror/view";
import { lintGutter, linter } from "@codemirror/lint";
import { jsonParseLinter } from "@codemirror/lang-json";


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
    if (schemas.some((schema) => schema.name === schemaName)) {
      setMessage({ text: "Схема с таким именем уже существует!", type: "error" });
      return;
    }
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
  
    try {
      const currentJson = JSON.parse(value);
      if (typeof currentJson !== "object" || Array.isArray(currentJson)) {
        throw new Error("Текущий JSON должен быть объектом");
      }
  
      const defaultJson = { ...currentJson };
      schema.fields.forEach((field) => {
        if (!(field.name in defaultJson)) {
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
        }
      });
  
      setValue(JSON.stringify(defaultJson, null, 2));
    } catch (error) {
      setMessage({ text: `Ошибка вставки схемы: ${error.message}`, type: "error" });
    }
  };

  const handleRemoveField = (index) => {
    const updatedFields = fields.filter((_, i) => i !== index);
    setFields(updatedFields);
  };

  const handleDeleteSchema = (schemaName) => {
    const updatedSchemas = schemas.filter((s) => s.name !== schemaName);
    setSchemas(updatedSchemas);
    localStorage.setItem("schemas", JSON.stringify(updatedSchemas));
    setSelectedSchema(""); // Сбрасываем выбор после удаления
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(value).then(() => {
      setMessage({ text: "JSON скопирован в буфер обмена!", type: "success" });
    }).catch(() => {
      setMessage({ text: "Не удалось скопировать JSON", type: "error" });
    });
  };

  const extensions = [
    json(),
    history(),
    keymap.of([...historyKeymap, ...searchKeymap]),
    highlightSelectionMatches(),
    lintGutter(),
    linter(jsonParseLinter()),
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
        <button onClick={handleCopyToClipboard}>Скопировать JSON</button>
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
        <button onClick={() => handleRemoveField(index)}>Удалить</button>
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
      <button 
        onClick={() => handleDeleteSchema(selectedSchema)}
        disabled={!selectedSchema}>Удалить
      </button>
    </div>
  );
};

export default JsonEditor;

//////////////////////////////////////////////////////////////////////
  /*useImperativeHandle(ref, () => ({
    setIsExpanded: (isOpen) => setIsExpanded(isOpen),
    setJsonValue: (json) => {
      try {
        const jsonStr = typeof json === 'string' ? json : JSON.stringify(json, null, 2);
        setJsonValue(jsonStr);
        return { result: 'success' };
      } catch (e) {
        return { result: 'fail', message: e.message };
      }
    },
    getJsonValue: () => jsonValue,
    getJsonData: () => {
      try {
        return { 
          result: 'success', 
          data: jsonValue,
          parsed: JSON.parse(jsonValue)
        };
      } catch (e) {
        return { result: 'fail', message: e.message };
      }
    },
    setTheme: (themeName) => {
      if (themes[themeName]) {
        setTheme(themeName);
        return { result: 'success' };
      }
      return { result: 'fail', message: 'Invalid theme name' };
    },
    isOpen: () => isExpanded
  }));*/

  useEffect(() => {
    const api = {
      open: () => setIsExpanded(true),
      close: () => setIsExpanded(false),
      loadJson: (json) => {
        try {
          const jsonStr = typeof json === 'string' ? json : JSON.stringify(json);
          setJsonValue(jsonStr);
          return Promise.resolve({ result: 'success' });
        } catch (e) {
          return Promise.resolve({ result: 'fail', message: e.message });
        }
      },
      getJson: () => {
        try {
          return Promise.resolve({
            result: 'success',
            data: jsonValue,
            parsed: JSON.parse(jsonValue)
          });
        } catch (e) {
          return Promise.resolve({ result: 'fail', message: e.message });
        }
      }
    };

    // Для основного окна
    window.jsonEditorApi = api;
    
    // Для родительского окна (если мы в iframe)
    if (typeof parent !== 'undefined') {
      parent.jsonEditorApi = api;
    }

    return () => {
      delete window.jsonEditorApi;
      if (typeof parent !== 'undefined') {
        delete parent.jsonEditorApi;
      }
    };
  }, [jsonValue]);


  
    // Экспортируем методы API через ref
    useImperativeHandle(ref, () => ({
      open: () => {
        setIsExpanded(true);
        return Promise.resolve({ result: 'success' });
      },
      close: () => {
        setIsExpanded(false);
        return Promise.resolve({ result: 'success' });
      },
      loadJson: (json) => {
        try {
          const jsonStr = typeof json === 'string' ? json : JSON.stringify(json, null, 2);
          setJsonValue(jsonStr);
          return Promise.resolve({ result: 'success' });
        } catch (e) {
          return Promise.resolve({ result: 'fail', message: e.message });
        }
      },
      getJson: () => {
        try {
          return Promise.resolve({ 
            result: 'success', 
            data: jsonValue,
            parsed: JSON.parse(jsonValue)
          });
        } catch (e) {
          return Promise.resolve({ result: 'fail', message: e.message });
        }
      },
      setTheme: (themeName) => {
        if (themes[themeName]) {
          setTheme(themeName);
          return Promise.resolve({ result: 'success' });
        }
        return Promise.resolve({ result: 'fail', message: 'Invalid theme name' });
      },
      isOpen: () => isExpanded
    }));
  
    // Инициализация глобального API при монтировании
    useEffect(() => {
      window.jsonEditorApi = {
        open: () => {
          setIsExpanded(true);
          return Promise.resolve({ result: 'success' });
        },
        close: () => {
          setIsExpanded(false);
          return Promise.resolve({ result: 'success' });
        },
        loadJson: (json) => {
          try {
            const jsonStr = typeof json === 'string' ? json : JSON.stringify(json, null, 2);
            setJsonValue(jsonStr);
            return Promise.resolve({ result: 'success' });
          } catch (e) {
            return Promise.resolve({ result: 'fail', message: e.message });
          }
        },
        getJson: () => {
          try {
            return Promise.resolve({ 
              result: 'success', 
              data: jsonValue,
              parsed: JSON.parse(jsonValue)
            });
          } catch (e) {
            return Promise.resolve({ result: 'fail', message: e.message });
          }
        },
        setTheme: (themeName) => {
          if (themes[themeName]) {
            setTheme(themeName);
            return Promise.resolve({ result: 'success' });
          }
          return Promise.resolve({ result: 'fail', message: 'Invalid theme name' });
        },
        isOpen: () => isExpanded
      };
    }, [jsonValue, isExpanded]);
  