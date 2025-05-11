/*export class JsonEditorApi {
  constructor(editorRef) {
    this.editor = editorRef.current;
  }

  open() {
    return new Promise((resolve) => {
      if (!this.editor) {
        resolve({ result: 'fail', message: 'Editor not initialized' });
        return;
      }
      const result = this.editor.setIsExpanded(true);
      resolve(result || { result: 'success' });
    });
  }

  close() {
    return new Promise((resolve) => {
      if (!this.editor) {
        resolve({ result: 'fail', message: 'Editor not initialized' });
        return;
      }
      const result = this.editor.setIsExpanded(false);
      resolve(result || { result: 'success' });
    });
  }

  loadJson(json) {
    return new Promise((resolve) => {
      if (!this.editor) {
        resolve({ result: 'fail', message: 'Editor not initialized' });
        return;
      }
      resolve(this.editor.setJsonValue(json));
    });
  }

  getJson() {
    return new Promise((resolve) => {
      if (!this.editor) {
        resolve({ result: 'fail', message: 'Editor not initialized' });
        return;
      }
      resolve(this.editor.getJsonData());
    });
  }

  setTheme(themeName) {
    return new Promise((resolve) => {
      if (!this.editor) {
        resolve({ result: 'fail', message: 'Editor not initialized' });
        return;
      }
      resolve(this.editor.setTheme(themeName));
    });
  }

  isOpen() {
    return new Promise((resolve) => {
      resolve(this.editor ? this.editor.isOpen() : false);
    });
  }
}*/
/*
export class JsonEditorApi {
    constructor(editorInstance) {
      this.editor = editorInstance;
      this._callbacks = {};
      this._nextId = 0;
      
      // Делаем API доступным глобально
      window.jsonEditorApi = this;
      
      this._setupMessageListener();
    }
  
    _setupMessageListener() {
      window.addEventListener('message', this._handleMessage.bind(this));
    }
  
    _handleMessage(event) {
      if (event.data.type === 'JSON_EDITOR_API_RESPONSE') {
        const { id, response } = event.data;
        const callback = this._callbacks[id];
        
        if (callback) {
          delete this._callbacks[id];
          if (response.result === 'success') {
            callback.resolve(response);
          } else {
            callback.reject(response);
          }
        }
      }
    }
  
    _send(command, data = {}) {
      const id = ++this._nextId;
      const promise = new Promise((resolve, reject) => {
        this._callbacks[id] = { resolve, reject };
        
        setTimeout(() => {
          if (this._callbacks[id]) {
            delete this._callbacks[id];
            reject({ result: 'fail', message: 'Timeout' });
          }
        }, 2000);
      });
  
      try {
        // Отправляем команду самому себе (в том же окне)
        window.postMessage({
          type: 'JSON_EDITOR_API',
          command,
          data,
          id
        }, window.location.origin);
      } catch (e) {
        delete this._callbacks[id];
        return Promise.reject({ result: 'fail', message: e.message });
      }
  
      return promise;
    }
  
    // Основные методы API
    async open() {
      if (!this.editor) {
        return { result: 'fail', message: 'Editor not initialized' };
      }
      this.editor.setOpenState(true);
      return { result: 'success' };
    }
  
    async close() {
      if (!this.editor) {
        return { result: 'fail', message: 'Editor not initialized' };
      }
      this.editor.setOpenState(false);
      return { result: 'success' };
    }
  
    async loadJson(json) {
      if (!this.editor) {
        return { result: 'fail', message: 'Editor not initialized' };
      }
      try {
        const jsonStr = typeof json === 'string' ? json : JSON.stringify(json);
        this.editor.setValue(jsonStr);
        return { result: 'success' };
      } catch (e) {
        return { result: 'fail', message: e.message };
      }
    }
  
    async getJson() {
      if (!this.editor) {
        return { result: 'fail', message: 'Editor not initialized' };
      }
      try {
        const json = this.editor.getValue();
        return { 
          result: 'success', 
          data: json,
          parsed: JSON.parse(json)
        };
      } catch (e) {
        return { result: 'fail', message: e.message };
      }
    }
  }
*/