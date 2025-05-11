import React, { useState } from "react";
import { JsonEditor } from "features/json-editor/ui/JsonEditor";
import { SchemaManager } from "features/schema-manager/ui/SchemaManager";
import { createDefaultJsonFromSchema } from "entities/schema/model";

export const EditorPage = () => {
  const [jsonValue, setJsonValue] = useState("{}");
  const [schemas, setSchemas] = useState([]);

  const handleSaveSchema = (schema) => {
    setSchemas([...schemas, schema]);
  };

  const handleDeleteSchema = (schemaName) => {
    setSchemas(schemas.filter((s) => s.name !== schemaName));
  };

  const handleInsertSchema = (schema) => {
    const defaultJson = createDefaultJsonFromSchema(schema);
    setJsonValue(JSON.stringify(defaultJson, null, 2));
  };

  return (
    <div>
      <JsonEditor value={jsonValue} onChange={setJsonValue} onInsertSchema={handleInsertSchema} />
      <SchemaManager
        schemas={schemas}
        onSaveSchema={handleSaveSchema}
        onDeleteSchema={handleDeleteSchema}
        onInsertSchema={handleInsertSchema}
      />
    </div>
  );
};