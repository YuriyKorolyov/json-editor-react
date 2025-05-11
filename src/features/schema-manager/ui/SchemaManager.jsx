import React, { useState } from "react";
import { createDefaultJsonFromSchema } from "entities/schema/model";

export const SchemaManager = ({ schemas, onSaveSchema, onDeleteSchema, onInsertSchema }) => {
  const [schemaName, setSchemaName] = useState("");
  const [fields, setFields] = useState([]);
  const [selectedSchema, setSelectedSchema] = useState(null);

  const handleAddField = () => {
    setFields([...fields, { name: "", type: "string" }]);
  };

  const handleSaveSchema = () => {
    if (!schemaName.trim()) return;
    onSaveSchema({ name: schemaName, fields });
    setSchemaName("");
    setFields([]);
  };

  const handleInsertSchema = () => {
    if (!selectedSchema) return;
    const schema = schemas.find((s) => s.name === selectedSchema);
    if (schema) onInsertSchema(schema);
  };

  return (
    <div>
      <h3>Создание схемы</h3>
      <input
        type="text"
        placeholder="Название схемы"
        value={schemaName}
        onChange={(e) => setSchemaName(e.target.value)}
      />
      <button onClick={handleAddField}>Добавить поле</button>
      {fields.map((field, index) => (
        <div key={index}>
          <input
            type="text"
            placeholder="Имя поля"
            value={field.name}
            onChange={(e) => {
              const updatedFields = [...fields];
              updatedFields[index].name = e.target.value;
              setFields(updatedFields);
            }}
          />
          <select
            value={field.type}
            onChange={(e) => {
              const updatedFields = [...fields];
              updatedFields[index].type = e.target.value;
              setFields(updatedFields);
            }}
          >
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
        {schemas.map((schema) => (
          <option key={schema.name} value={schema.name}>
            {schema.name}
          </option>
        ))}
      </select>
      <button onClick={handleInsertSchema}>Вставить схему</button>
      <button
        onClick={() => selectedSchema && onDeleteSchema(selectedSchema)}
        disabled={!selectedSchema}
      >
        Удалить
      </button>
    </div>
  );
};