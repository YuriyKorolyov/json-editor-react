import React from "react";
import CodeMirror from "@uiw/react-codemirror";
import { json } from "@codemirror/lang-json";
import { createTheme } from "@uiw/codemirror-themes";
import { tags as t } from "@lezer/highlight";

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
    { tag: t.propertyName, color: "#9cdcfe" }, // Голубой цвет для ключей
    { tag: t.string, color: "#ce9178" }, // Оранжевый цвет для строк
    { tag: t.number, color: "#b5cea8" }, // Зеленый цвет для чисел
    { tag: t.bool, color: "#569cd6" }, // Синий цвет для boolean
    { tag: t.null, color: "#569cd6" }, // Синий цвет для null
    { tag: t.keyword, color: "#c586c0" }, // Фиолетовый для ключевых слов
  ],
});

const JsonEditor = () => {
  const onChange = (value) => {
    console.log("JSON Value:", value);
  };

  return (
    <CodeMirror
      value={`{
  "key": "value",
  "number": 123,
  "boolean": true,
  "nullValue": null
}`}
      height="200px"
      theme={vscodeDarkModern}
      extensions={[json()]}
      onChange={onChange}
    />
  );
};

export default JsonEditor;
