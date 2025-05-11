export const createDefaultJsonFromSchema = (schema) => {
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
    return defaultJson;
  };