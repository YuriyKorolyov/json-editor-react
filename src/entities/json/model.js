export const parseJson = (value) => {
    try {
      return JSON.parse(value);
    } catch (error) {
      throw new Error(`Некорректный JSON: ${error.message}`);
    }
  };
  
  export const formatJson = (value) => {
    return JSON.stringify(parseJson(value), null, 2);
  };