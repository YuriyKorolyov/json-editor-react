import React, { useState, useRef, useEffect } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { json } from "@codemirror/lang-json";
import { history, undo, redo, historyKeymap } from "@codemirror/commands";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import { keymap } from "@codemirror/view";
import { lintGutter, linter } from "@codemirror/lint";
import { jsonParseLinter } from "@codemirror/lang-json";
import { vscodeDarkModern } from "../lib/theme";
import { formatJson } from "entities/json/model";

export const JsonEditor = ({ value, onChange, onInsertSchema }) => {
  const editorRef = useRef(null);
  const [message, setMessage] = useState("");

  // Проверка корректности JSON
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
      const formatted = formatJson(value);
      onChange(formatted);
      setMessage({ text: "JSON отформатирован успешно!", type: "success" });
    } catch (error) {
      setMessage({ text: `Ошибка форматирования JSON: ${error.message}`, type: "error" });
    }
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
      <CodeMirror
        value={value}
        height="300px"
        theme={vscodeDarkModern}
        extensions={extensions}
        onChange={onChange}
        ref={editorRef}
      />
      <div className="buttons">
        <button onClick={handleFormat}>Формат JSON</button>
        <button onClick={() => onChange("{}")}>Очистить</button>
        <button onClick={() => undo(editorRef.current?.view)}>Undo (Ctrl+Z)</button>
        <button onClick={() => redo(editorRef.current?.view)}>Redo (Ctrl+Y)</button>
        <button onClick={handleCopyToClipboard}>Скопировать JSON</button>
      </div>

      {message && <div className={`message ${message.type}`}>{message.text}</div>}
    </div>
  );
};