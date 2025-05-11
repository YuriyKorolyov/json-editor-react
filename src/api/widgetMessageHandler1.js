/**
 * Обработчик сообщений API внутри виджета
 */
export function setupWidgetMessageHandler(editorInstance) {
    const handleApiCommand = async (command, data, id) => {
      const respond = (response) => {
        window.postMessage({
          type: 'JSON_EDITOR_API_RESPONSE',
          id,
          response
        }, '*');
      };
  
      try {
        let result;
        
        switch(command) {
          case 'open':
            editorInstance.setOpenState(true);
            result = { result: 'success' };
            break;
            
          case 'close':
            editorInstance.setOpenState(false);
            result = { result: 'success' };
            break;
            
          case 'loadJson':
            editorInstance.setValue(data.data);
            result = { result: 'success' };
            break;
            
          case 'getJson':
            const json = editorInstance.getValue();
            result = { 
              result: 'success', 
              data: json,
              parsed: JSON.parse(json)
            };
            break;
            
          case 'setTheme':
            editorInstance.setTheme(data.theme);
            result = { result: 'success' };
            break;
            
          case 'validate':
            const validationResult = editorInstance.validate();
            result = { 
              result: 'success',
              ...validationResult
            };
            break;
            
          case 'generateSchema':
            const schema = editorInstance.generateSchema();
            result = {
              result: 'success',
              schema
            };
            break;
            
          default:
            throw new Error(`Unknown command: ${command}`);
        }
        
        respond(result);
      } catch (error) {
        respond({
          result: 'fail',
          message: error.message
        });
      }
    };
  
    // Установка обработчика сообщений
    window.addEventListener('message', (event) => {
      if (event.data.type === 'JSON_EDITOR_API') {
        const { command, data, id } = event.data;
        handleApiCommand(command, data, id);
      }
    });
  }