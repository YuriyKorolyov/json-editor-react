import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle, useCallback } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { json } from "@codemirror/lang-json";
import { createTheme } from "@uiw/codemirror-themes";
import { tags as t } from "@lezer/highlight";
import { history, undo, redo, historyKeymap } from "@codemirror/commands";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import { keymap } from "@codemirror/view";
import { lintGutter, linter } from "@codemirror/lint";
import { jsonParseLinter } from "@codemirror/lang-json";
import Ajv from "ajv";
import { 
  FaCode, FaEdit, FaFileAlt, FaFileDownload, FaFileUpload,
  FaCopy, FaCheck, FaTimes, FaMagic, FaCheckCircle,
  FaUndo, FaRedo, FaTrash, FaPlus, FaMinus, FaPalette,
  FaSlidersH, FaList, FaObjectGroup, FaCog, FaSort,
  FaSortUp, FaSortDown, FaFilter, FaSearch, FaInfoCircle
} from "react-icons/fa";
import { vscodeDark } from '@uiw/codemirror-theme-vscode';
import { githubLight } from '@uiw/codemirror-theme-github';
import "./JE.css";

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

const themes = {
  'dark': {
    name: 'Тёмная',
    cmTheme: vscodeDarkModern,
    containerClass: ''
  },
  'light': {
    name: 'Светлая',
    cmTheme: githubLight,
    containerClass: 'light-theme'
  },
  'vscode-dark': {
    name: 'VS Code Тёмная',
    cmTheme: vscodeDark,
    containerClass: ''
  }
};

const EditorButton = ({ icon, label, onClick, disabled = false, title }) => (
  <button 
    onClick={onClick} 
    disabled={disabled}
    title={title || label}
    className="editor-button"
  >
    {icon}
    <span>{label}</span>
  </button>
);

const SmallButton = ({ icon, label, onClick, disabled = false }) => (
  <button 
    onClick={onClick} 
    disabled={disabled}
    className="small-button"
    title={label}
  >
    {icon}
  </button>
);

const JsonFormEditor = ({ data, onChange, isSchema, onSort, onFilter, sortConfig, filterText, filterKey, onFilterChange }) => {
  const determineFieldType = (key, value) => {
    if (isSchema) {
      if (key === "type") return "schema-type";
      if (key === "properties") return "schema-properties";
      if (key === "required") return "schema-required";
      return "default";
    }

    if (key.toLowerCase().includes('color')) return 'color';
    if (key.toLowerCase().includes('date')) {
      if (key.toLowerCase().includes('time')) return 'datetime';
      return 'date';
    }
    if (key.toLowerCase().includes('time')) return 'time';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'checkbox';
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'object' && value !== null) return 'object';
    if (value && value.length > 50) return 'textarea';
    return 'text';
  };

  const handleChange = (key, value) => {
    const updatedData = { ...data, [key]: value };
    onChange(updatedData);
  };

  const handleNestedChange = (key, nestedKey, nestedValue) => {
    const updatedData = { 
      ...data, 
      [key]: { 
        ...data[key], 
        [nestedKey]: nestedValue 
      } 
    };
    onChange(updatedData);
  };

  const handleArrayChange = (key, index, newValue) => {
    const newArray = [...data[key]];
    newArray[index] = newValue;
    handleChange(key, newArray);
  };

  const handleAddArrayItem = (key) => {
    handleChange(key, [...(data[key] || []), isSchema ? "" : {}]);
  };

  const handleRemoveArrayItem = (key, index) => {
    const newArray = data[key].filter((_, i) => i !== index);
    handleChange(key, newArray);
  };

  const handleAddProperty = () => {
    const newProperties = { 
      ...data.properties, 
      ["newProperty"]: { type: "string" } 
    };
    handleChange("properties", newProperties);
  };

  const getArrayKeys = (arr) => {
    if (Array.isArray(arr) && arr.length > 0 && typeof arr[0] === 'object') {
      return Object.keys(arr[0]);
    }
    return [];
  };

  const renderField = (key, value) => {
    const fieldType = determineFieldType(key, value);

    switch (fieldType) {
      case 'color':
        return (
          <div className="color-field">
            <input
              type="color"
              value={value || '#ffffff'}
              onChange={(e) => handleChange(key, e.target.value)}
            />
            <span>{value || '#ffffff'}</span>
          </div>
        );
      case 'number':
        return (
          <div className="number-field">
            <input
              type="range"
              min="0"
              max="100"
              value={value || 0}
              onChange={(e) => handleChange(key, Number(e.target.value))}
            />
            <input
              type="number"
              value={value || 0}
              onChange={(e) => handleChange(key, Number(e.target.value))}
            />
          </div>
        );
      case 'date':
        return (
          <input
            type="date"
            value={value || ''}
            onChange={(e) => handleChange(key, e.target.value)}
          />
        );
      case 'datetime':
        return (
          <input
            type="datetime-local"
            value={value || ''}
            onChange={(e) => handleChange(key, e.target.value)}
          />
        );
      case 'time':
        return (
          <input
            type="time"
            value={value || ''}
            onChange={(e) => handleChange(key, e.target.value)}
          />
        );
      case 'textarea':
        return (
          <textarea
            value={value || ''}
            onChange={(e) => handleChange(key, e.target.value)}
          />
        );
      case 'checkbox':
        return (
          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={!!value}
              onChange={(e) => handleChange(key, e.target.checked)}
            />
            <span>{value ? 'true' : 'false'}</span>
          </label>
        );
      case 'schema-type':
        return (
          <select
            value={value || 'object'}
            onChange={(e) => handleChange(key, e.target.value)}
          >
            <option value="object">объект</option>
            <option value="array">массив</option>
            <option value="string">строка</option>
            <option value="number">число</option>
            <option value="boolean">логический</option>
          </select>
        );
      case 'schema-properties':
        return (
          <div className="schema-properties">
            <EditorButton 
              icon={<FaPlus />}
              label="Добавить свойство"
              onClick={handleAddProperty}
            />
            {value && Object.entries(value).map(([propName, propSchema]) => (
              <div key={propName} className="property-editor">
                <div className="property-header">
                  <h4>{propName}</h4>
                  <SmallButton 
                    icon={<FaTimes />}
                    label="Remove Property"
                    onClick={() => {
                      const { [propName]: _, ...rest } = value;
                      handleChange(key, rest);
                    }}
                  />
                </div>
                <JsonFormEditor 
                  data={propSchema} 
                  onChange={(newSchema) => handleNestedChange(key, propName, newSchema)}
                  isSchema={true}
                />
              </div>
            ))}
          </div>
        );
      case 'schema-required':
        return (
          <div className="array-field">
            {value && value.map((item, index) => (
              <div key={index} className="array-item">
                <input
                  type="text"
                  value={item}
                  onChange={(e) => handleArrayChange(key, index, e.target.value)}
                />
                <SmallButton 
                  icon={<FaTimes />}
                  label="Remove Required Field"
                  onClick={() => handleRemoveArrayItem(key, index)}
                />
              </div>
            ))}
            <SmallButton 
              icon={<FaPlus />}
              label="Add Required Field"
              onClick={() => handleAddArrayItem(key)}
            />
          </div>
        );
      case 'array':
        return (
          <div className="array-field">
            {key === '' && (
              <div className="array-controls">
                <div className="sort-controls">
                  <select
                    value={sortConfig?.key || ''}
                    onChange={(e) => onSort(e.target.value)}
                  >
                    <option value="">Select field to sort</option>
                    {getArrayKeys(data).map(k => (
                      <option key={k} value={k}>{k}</option>
                    ))}
                  </select>
                  {sortConfig?.key && (
                    <SmallButton
                      icon={sortConfig.direction === 'asc' ? <FaSortUp /> : <FaSortDown />}
                      onClick={() => onSort(sortConfig.key)}
                      title={`Sort ${sortConfig.direction === 'asc' ? 'descending' : 'ascending'}`}
                    />
                  )}
                </div>
                <div className="filter-controls">
                  <input
                    type="text"
                    placeholder="Filter text"
                    value={filterText}
                    onChange={(e) => onFilterChange('text', e.target.value)}
                  />
                  <select
                    value={filterKey}
                    onChange={(e) => onFilterChange('key', e.target.value)}
                  >
                    <option value="">All fields</option>
                    {getArrayKeys(data).map(k => (
                      <option key={k} value={k}>{k}</option>
                    ))}
                  </select>
                  <SmallButton
                    icon={<FaSearch />}
                    onClick={onFilter}
                    title="Apply filter"
                  />
                  {(filterText || filterKey) && (
                    <SmallButton
                      icon={<FaTimes />}
                      onClick={() => onFilterChange('reset')}
                      title="Reset filter"
                    />
                  )}
                </div>
              </div>
            )}
            {value && value.map((item, index) => (
              <div key={index} className="array-item">
                {isSchema ? (
                  <input
                    type="text"
                    value={item}
                    onChange={(e) => handleArrayChange(key, index, e.target.value)}
                  />
                ) : (
                  <JsonFormEditor 
                    data={item} 
                    onChange={(newItem) => {
                      const newArray = [...value];
                      newArray[index] = newItem;
                      handleChange(key, newArray);
                    }}
                    isSchema={false}
                  />
                )}
                <SmallButton 
                  icon={<FaTimes />}
                  label="Remove Item"
                  onClick={() => handleRemoveArrayItem(key, index)}
                />
              </div>
            ))}
            <SmallButton 
              icon={<FaPlus />}
              label="Add Item"
              onClick={() => handleAddArrayItem(key)}
            />
          </div>
        );
      case 'object':
        return (
          <div className="nested-object">
            <JsonFormEditor 
              data={value || {}} 
              onChange={(newValue) => handleChange(key, newValue)} 
              isSchema={isSchema}
            />
          </div>
        );
      default:
        return (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => handleChange(key, e.target.value)}
          />
        );
    }
  };

  if (!data || typeof data !== 'object') {
    return <div className="form-message">Некорректные {isSchema ? "схема" : "JSON"} данные</div>;
  }

  return (
    <div className={`json-form-editor ${isSchema ? 'schema-editor-form' : ''}`}>
      {Object.keys(data).map((key) => (
        <div key={key} className="form-field">
          <label>{key}</label>
          {renderField(key, data[key])}
        </div>
      ))}
    </div>
  );
};

const JsonEditor = forwardRef((props, ref) => {
  const [isResizing, setIsResizing] = useState(false);
  const [startSize, setStartSize] = useState({ width: 500, height: '70vh' });
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isOverDragHandle, setIsOverDragHandle] = useState(false);
  const [position, setPosition] = useState(() => {
    const savedPos = localStorage.getItem("jsonEditorPosition");
    return savedPos ? JSON.parse(savedPos) : { x: 0, y: 0 };
  });
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);
  const [editingPairId, setEditingPairId] = useState(null);
  const [editingPairName, setEditingPairName] = useState('');
  const [registry, setRegistry] = useState(() => {
    const savedRegistry = localStorage.getItem("jsonEditorRegistry");
    return savedRegistry ? JSON.parse(savedRegistry) : [];
  });
  const [activePairId, setActivePairId] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('json');
  const [editMode, setEditMode] = useState('code');
  const [jsonValue, setJsonValue] = useState(() => {
    const savedValue = localStorage.getItem("jsonEditorContent");
    return savedValue ? savedValue : `{\n  "example": "data"\n}`;
  });
  const [jsonData, setJsonData] = useState({});
  const [schemaValue, setSchemaValue] = useState(() => {
    const savedValue = localStorage.getItem("jsonSchemaContent");
    return savedValue ? savedValue : `{\n  "type": "object",\n  "properties": {}\n}`;
  });
  const [schemaData, setSchemaData] = useState({});
  const [message, setMessage] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [filterText, setFilterText] = useState('');
  const [filterKey, setFilterKey] = useState('');
  const [originalJson, setOriginalJson] = useState('');
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("jsonEditorTheme") || 'dark';
  });
  const editorRef = useRef(null);
  const schemaEditorRef = useRef(null);
  const ajv = new Ajv();

  useImperativeHandle(ref, () => ({
    setUserToken: (token) => {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        localStorage.setItem('jsonEditorUserToken', token);
        localStorage.setItem('jsonEditorUserId', payload.id);
        return Promise.resolve({ result: 'success', userId: payload.id });
      } catch (e) {
        return Promise.resolve({ result: 'fail', message: e.message });
      }
    },
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

  useEffect(() => {
    window.jsonEditorApi = {
      open: () => setIsExpanded(true),
      close: () => setIsExpanded(false),
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
      isOpen: () => isExpanded,
      setUserToken: (token) => {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          localStorage.setItem('jsonEditorUserToken', token);
          localStorage.setItem('jsonEditorUserId', payload.id);
          return Promise.resolve({ result: 'success', userId: payload.id });
        } catch (e) {
          return Promise.resolve({ result: 'fail', message: e.message });
        }
      },
    };
  }, [jsonValue, isExpanded]);

  const extensions = [
    json(),
    history(),
    keymap.of([...historyKeymap, ...searchKeymap]),
    highlightSelectionMatches(),
    lintGutter(),
    linter(jsonParseLinter()),
  ];

  useEffect(() => {
    const savedValue = localStorage.getItem("jsonEditorContent");
    if (savedValue) {
      setOriginalJson(savedValue);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("jsonEditorContent", jsonValue);
  }, [jsonValue]);

  useEffect(() => {
    localStorage.setItem("jsonSchemaContent", schemaValue);
  }, [schemaValue]);

  useEffect(() => {
    localStorage.setItem("jsonEditorTheme", theme);
  }, [theme]);

  useEffect(() => {
    try {
      const parsed = JSON.parse(jsonValue);
      setJsonData(parsed);
    } catch {
      setJsonData({});
    }
  }, [jsonValue]);

  useEffect(() => {
    try {
      const parsed = JSON.parse(schemaValue);
      setSchemaData(parsed);
    } catch {
      setSchemaData({});
    }
  }, [schemaValue]);

  useEffect(() => {
    try {
      if (activeTab === 'json') {
        JSON.parse(jsonValue);
        if (!message || message.type !== 'error') {
          setMessage({ text: "Valid JSON!", type: "success" });
        }
      } else {
        JSON.parse(schemaValue);
        if (!message || message.type !== 'error') {
          setMessage({ text: "Valid JSON Schema!", type: "success" });
        }
      }
    } catch (error) {
      setMessage({ 
        text: `Invalid ${activeTab === 'json' ? 'JSON' : 'JSON Schema'}: ${error.message}`, 
        type: "error" 
      });
    }
  }, [jsonValue, schemaValue, activeTab]);

  useEffect(() => {
    const savedPos = localStorage.getItem("jsonEditorPosition");
    const savedSize = localStorage.getItem("jsonEditorSize");
    
    if (savedPos) {
      setPosition(JSON.parse(savedPos));
    }
    
    if (savedSize) {
      setStartSize(JSON.parse(savedSize));
    }
  }, []);

  useEffect(() => {
    if (!isResizing && isExpanded) {
      localStorage.setItem("jsonEditorSize", JSON.stringify({
        width: containerRef.current?.offsetWidth,
        height: containerRef.current?.offsetHeight
      }));
    }
  }, [isResizing, isExpanded]);

  useEffect(() => {
    if (isExpanded) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isExpanded, isDragging, offset]);

  useEffect(() => {
    const savedPos = localStorage.getItem("jsonEditorPosition");
    if (savedPos) {
      setPosition(JSON.parse(savedPos));
    }
  }, []);

  const handleResizeMouseDown = (e) => {
    setIsResizing(true);
    setStartPos({
      x: e.clientX,
      y: e.clientY
    });
    setStartSize({
      width: containerRef.current.offsetWidth,
      height: containerRef.current.offsetHeight
    });
    e.preventDefault();
  };

  const handleResizeMouseMove = useCallback((e) => {
    if (!isResizing) return;
    
    const dx = e.clientX - startPos.x;
    const dy = e.clientY - startPos.y;
    
    const newWidth = Math.max(400, Math.min(window.innerWidth - 20, startSize.width + dx));
    const newHeight = Math.max(300, Math.min(window.innerHeight - 20, startSize.height + dy));
    
    containerRef.current.style.width = `${newWidth}px`;
    containerRef.current.style.height = `${newHeight}px`;
  }, [isResizing, startPos, startSize]);

  const handleResizeMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMouseMove);
      document.addEventListener('mouseup', handleResizeMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleResizeMouseMove);
        document.removeEventListener('mouseup', handleResizeMouseUp);
      };
    }
  }, [isResizing, handleResizeMouseMove, handleResizeMouseUp]);

  const handleMouseDown = (e) => {
    if (e.target.closest('.editor-header')) {
      setIsDragging(true);
      setDragStartPos({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
      e.preventDefault();
    }
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    
    const newX = e.clientX - dragStartPos.x;
    const newY = e.clientY - dragStartPos.y;
    
    const maxX = window.innerWidth - containerRef.current.offsetWidth;
    const maxY = window.innerHeight - containerRef.current.offsetHeight;
    
    setPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY))
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    localStorage.setItem("jsonEditorPosition", JSON.stringify(position));
  };

  const startEditingPairName = (pair) => {
    setEditingPairId(pair.id);
    setEditingPairName(pair.name);
  };
  
  const savePairName = (id) => {
    const updatedRegistry = registry.map(item => 
      item.id === id 
        ? { ...item, name: editingPairName } 
        : item
    );
    
    setRegistry(updatedRegistry);
    localStorage.setItem("jsonEditorRegistry", JSON.stringify(updatedRegistry));
    setEditingPairId(null);
    setEditingPairName('');
    setMessage({ text: "Название JSON-объекта обновлено!", type: "success" });
  };
  
  const cancelEditingPairName = () => {
    setEditingPairId(null);
    setEditingPairName('');
  };

  const saveToRegistry = () => {
    const newPair = {
      id: Date.now(),
      json: jsonValue,
      schema: schemaValue,
      name: `JSON ${new Date().toLocaleString()}`,
      createdAt: new Date().toISOString()
    };
    
    const updatedRegistry = [...registry, newPair];
    setRegistry(updatedRegistry);
    localStorage.setItem("jsonEditorRegistry", JSON.stringify(updatedRegistry));
    setMessage({ text: "JSON сохранен!", type: "success" });
  };
  
  const loadFromRegistry = (id) => {
    const pair = registry.find(item => item.id === id);
    if (pair) {
      setJsonValue(pair.json);
      setSchemaValue(pair.schema);
      setOriginalJson(pair.json);
      setActivePairId(id);
      setMessage({ text: "JSON загружен!", type: "success" });
    }
  };
  
  const deleteFromRegistry = (id) => {
    const updatedRegistry = registry.filter(item => item.id !== id);
    setRegistry(updatedRegistry);
    localStorage.setItem("jsonEditorRegistry", JSON.stringify(updatedRegistry));
    
    if (activePairId === id) {
      setActivePairId(null);
      setJsonValue(`{\n  "example": "data"\n}`);
      setSchemaValue(`{\n  "type": "object",\n  "properties": {}\n}`);
    }
    
    setMessage({ text: "JSON удален!", type: "success" });
  };
  
  const updateRegistryPair = () => {
    if (!activePairId) return;
    
    const updatedRegistry = registry.map(item => 
      item.id === activePairId 
        ? { ...item, json: jsonValue, schema: schemaValue } 
        : item
    );
    
    setRegistry(updatedRegistry);
    localStorage.setItem("jsonEditorRegistry", JSON.stringify(updatedRegistry));
    setMessage({ text: "JSON обновлен!", type: "success" });
  };

  const isJsonArray = () => {
    try {
      const parsed = JSON.parse(jsonValue);
      return Array.isArray(parsed);
    } catch {
      return false;
    }
  };

  const getArrayKeys = () => {
    try {
      const parsed = JSON.parse(jsonValue);
      if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'object') {
        return Object.keys(parsed[0]);
      }
    } catch {}
    return [];
  };

  const handleSort = (key) => {
    if (!key) {
      setSortConfig({ key: null, direction: 'asc' });
      return;
    }

    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });

    try {
      const parsed = JSON.parse(jsonValue);
      if (!Array.isArray(parsed)) return;

      const sorted = [...parsed].sort((a, b) => {
        if (a[key] == null) return 1;
        if (b[key] == null) return -1;
        if (a[key] < b[key]) return direction === 'asc' ? -1 : 1;
        if (a[key] > b[key]) return direction === 'asc' ? 1 : -1;
        return 0;
      });

      setJsonValue(JSON.stringify(sorted, null, 2));
      setMessage({ text: `Массив отсортирован по ${key} (${direction === 'asc' ? 'возрастанию' : 'убыванию'})`, type: "success" });
    } catch (error) {
      setMessage({ text: `Ошибка сортировки: ${error.message}`, type: "error" });
    }
  };

  const handleFilter = () => {
    try {
      const parsed = JSON.parse(originalJson || jsonValue);
      if (!Array.isArray(parsed)) return;

      const filtered = parsed.filter(item => {
        if (!filterKey) {
          return JSON.stringify(item).toLowerCase().includes(filterText.toLowerCase());
        } else {
          return item[filterKey] && 
            String(item[filterKey]).toLowerCase().includes(filterText.toLowerCase());
        }
      });

      setJsonValue(JSON.stringify(filtered, null, 2));
      setMessage({ 
        text: `Массив отфильтрован (осталось ${filtered.length} элементов)`, 
        type: "success" 
      });
    } catch (error) {
      setMessage({ text: `Ошибка фильтрации: ${error.message}`, type: "error" });
    }
  };

  const handleFilterChange = (type, value) => {
    if (type === 'reset') {
      setFilterText('');
      setFilterKey('');
      setJsonValue(originalJson);
      setMessage({ text: "Фильтр сброшен", type: "success" });
    } else if (type === 'text') {
      setFilterText(value);
    } else if (type === 'key') {
      setFilterKey(value);
    }
  };

  const generateSchemaFromJson = () => {
    try {
      const json = JSON.parse(jsonValue);
      const schema = convertJsonToSchema(json);
      setSchemaValue(JSON.stringify(schema, null, 2));
      setActiveTab('schema');
      setMessage({ text: "Схема успешно сгенерирована!", type: "success" });
    } catch (error) {
      setMessage({ text: `Ошибка генерации: ${error.message}`, type: "error" });
    }
  };

  const convertJsonToSchema = (json) => {
    if (Array.isArray(json)) {
      if (json.length > 0) {
        return {
          type: "array",
          items: convertJsonToSchema(json[0])
        };
      }
      return {
        type: "array",
        items: {}
      };
    } else if (typeof json === 'object' && json !== null) {
      const properties = {};
      const required = Object.keys(json);
      
      for (const [key, value] of Object.entries(json)) {
        properties[key] = convertJsonToSchema(value);
      }
      
      return {
        type: "object",
        properties,
        required
      };
    } else {
      return {
        type: typeof json
      };
    }
  };

  const validateJsonAgainstSchema = () => {
    try {
      const json = JSON.parse(jsonValue);
      const schema = JSON.parse(schemaValue);
      
      const validate = ajv.compile(schema);
      const valid = validate(json);

      if (valid) {
        setMessage({ text: "JSON соответствует схеме!", type: "success" });
      } else {
        setMessage({ 
          text: `Ошибки валидации: ${JSON.stringify(validate.errors, null, 2)}`, 
          type: "error" 
        });
      }
    } catch (error) {
      setMessage({ text: `Ошибка валидации: ${error.message}`, type: "error" });
    }
  };

  const handleJsonChange = (newJson) => {
    setJsonData(newJson);
    setJsonValue(JSON.stringify(newJson, null, 2));
  };

  const handleSchemaChange = (newSchema) => {
    setSchemaData(newSchema);
    setSchemaValue(JSON.stringify(newSchema, null, 2));
  };

  const handleFormat = () => {
    try {
      const formatted = activeTab === 'json' 
        ? JSON.stringify(JSON.parse(jsonValue), null, 2)
        : JSON.stringify(JSON.parse(schemaValue), null, 2);
      
      activeTab === 'json' ? setJsonValue(formatted) : setSchemaValue(formatted);
      setMessage({ 
        text: `${activeTab === 'json' ? 'JSON' : 'Схема'} успешно отформатирована!`, 
        type: "success" 
      });
    } catch (error) {
      setMessage({ 
        text: `Ошибка форматирования: ${error.message}`, 
        type: "error" 
      });
    }
  };

  const handleClear = () => {
    if (activeTab === 'json') {
      setJsonValue("{}");
      setJsonData({});
    } else {
      setSchemaValue(`{\n  "type": "object",\n  "properties": {}\n}`);
      setSchemaData({ type: "object", properties: {} });
    }
    setMessage(null);
  };

  const handleUndo = () => {
    const view = activeTab === 'json' 
      ? editorRef.current?.view 
      : schemaEditorRef.current?.view;
    if (view) undo(view);
  };

  const handleRedo = () => {
    const view = activeTab === 'json' 
      ? editorRef.current?.view 
      : schemaEditorRef.current?.view;
    if (view) redo(view);
  };

  const handleCopyToClipboard = () => {
    const text = activeTab === 'json' ? jsonValue : schemaValue;
    navigator.clipboard.writeText(text)
      .then(() => {
        setMessage({ 
          text: `${activeTab === 'json' ? 'JSON' : 'Схема'} скопирована в буфер обмена!`, 
          type: "success" 
        });
      })
      .catch(() => {
        setMessage({ 
          text: `Не удалось скопировать ${activeTab === 'json' ? 'JSON' : 'схему'}`, 
          type: "error" 
        });
      });
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target.result;
        JSON.parse(content);
        
        if (activeTab === 'json') {
          setJsonValue(JSON.stringify(JSON.parse(content), null, 2));
          setOriginalJson(JSON.stringify(JSON.parse(content), null, 2));
        } else {
          setSchemaValue(JSON.stringify(JSON.parse(content), null, 2));
        }
        
        setMessage({ 
          text: "Файл успешно загружен!", 
          type: "success" 
        });
      } catch (error) {
        setMessage({ 
          text: `Ошибка загрузки файла: ${error.message}`, 
          type: "error" 
        });
      }
    };
    reader.readAsText(file);
  };

  const handleFileDownload = () => {
    try {
      const text = activeTab === 'json' ? jsonValue : schemaValue;
      JSON.parse(text);
      
      const blob = new Blob([text], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = activeTab === 'json' ? "document.json" : "schema.json";
      a.click();
      URL.revokeObjectURL(url);
      
      setMessage({ 
        text: "Файл успешно сохранён!", 
        type: "success" 
      });
    } catch (error) {
      setMessage({ 
        text: `Ошибка сохранения файла: ${error.message}`, 
        type: "error" 
      });
    }
  };
})