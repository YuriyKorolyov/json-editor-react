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
  FaSortUp, FaSortDown, FaFilter, FaSearch, FaInfoCircle, FaChevronUp, FaChevronDown, FaSun, FaMoon, FaCogs, FaExpand, FaCompress, FaSave, FaArrowUp, FaArrowDown, FaChevronRight 
} from "react-icons/fa";
import { MdOutlineRule } from "react-icons/md";
import { vscodeDark } from '@uiw/codemirror-theme-vscode';
import { githubLight } from '@uiw/codemirror-theme-github';
import "./JE.css";

// Константы и темы
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

// Компоненты UI
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
    {React.cloneElement(icon, { size: 16 })}
  </button>
);

// Компонент редактора JSON формы
const JsonFormEditor = ({ 
  data, 
  onChange, 
  isSchema, 
  parentData, 
  onPropertyChange,
  showTempMessage = () => {}
}) => {
  const [editingPropName, setEditingPropName] = useState(null);
  const [tempPropName, setTempPropName] = useState('');
  const [propertyFilter, setPropertyFilter] = useState('');
  const [collapsedProperties, setCollapsedProperties] = useState([]);

  // Обработчики редактирования имени свойства
  const startEditingName = (propName) => {
    setEditingPropName(propName);
    setTempPropName(propName);
  };

  const savePropertyName = () => {
    if (!editingPropName || !tempPropName.trim() || editingPropName === tempPropName) {
      cancelEditingName();
      return;
    }

    const updatedProperties = { ...parentData.properties };
    updatedProperties[tempPropName] = updatedProperties[editingPropName];
    delete updatedProperties[editingPropName];

    onPropertyChange({ 
      ...parentData, 
      properties: updatedProperties 
    });
    
    showTempMessage(`Имя свойства изменено на ${tempPropName}`, "success");
    cancelEditingName();
  };

  const cancelEditingName = () => {
    setEditingPropName(null);
    setTempPropName('');
  };

  // Остальные обработчики...
  const togglePropertyCollapse = (propName) => {
    setCollapsedProperties(prev => 
      prev.includes(propName) 
        ? prev.filter(name => name !== propName) 
        : [...prev, propName]
    );
  };

  const handleDuplicateProperty = (propName) => {
    if (!parentData?.properties?.[propName]) {
      showTempMessage("Не удалось дублировать свойство", "error");
      return;
    }
    
    const newPropName = `${propName}_copy`;
    const updatedProperties = { 
      ...parentData.properties, 
      [newPropName]: JSON.parse(JSON.stringify(parentData.properties[propName]))
    };
    
    onPropertyChange({ ...parentData, properties: updatedProperties });
    showTempMessage(`Свойство ${propName} дублировано`, "success");
  };

  const handleMoveProperty = (propName, direction) => {
    const properties = parentData?.properties;
    if (!properties?.[propName]) {
      showTempMessage("Не удалось переместить свойство", "error");
      return;
    }
    
    const propertyKeys = Object.keys(properties);
    const currentIndex = propertyKeys.indexOf(propName);
    
    if (
      (direction === 'up' && currentIndex === 0) ||
      (direction === 'down' && currentIndex === propertyKeys.length - 1)
    ) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const newProperties = {};
    
    propertyKeys.forEach((key, index) => {
      if (index === newIndex) newProperties[propName] = properties[propName];
      if (key !== propName) newProperties[key] = properties[key];
    });

    onPropertyChange({ ...parentData, properties: newProperties });
  };

  // Рендер поля редактирования имени свойства
  const renderPropertyNameEditor = (propName) => (
    <div className="property-name-editor">
      <input
        type="text"
        value={tempPropName}
        onChange={(e) => setTempPropName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') savePropertyName();
          if (e.key === 'Escape') cancelEditingName();
        }}
        autoFocus
      />
      <div className="property-name-actions">
        <button 
          className="property-name-save"
          onClick={savePropertyName}
          title="Сохранить"
        >
          <FaCheck />
        </button>
        <button 
          className="property-name-cancel"
          onClick={cancelEditingName}
          title="Отмена"
        >
          <FaTimes />
        </button>
      </div>
    </div>
  );

  // Рендер обычного имени свойства
  const renderPropertyNameView = (propName) => (
    <>
      <button 
        onClick={() => togglePropertyCollapse(propName)}
        className="property-toggle"
      >
        {collapsedProperties.includes(propName) ? (
          <FaChevronRight />
        ) : (
          <FaChevronDown />
        )}
        {propName}
      </button>
      <div className="property-type-badge">
        {data.properties[propName].type || 'mixed'}
      </div>
    </>
  );

  // Рендер действий для свойства
  const renderPropertyActions = (propName, index, arr) => (
    <div className="property-actions">
      {editingPropName !== propName && (
        <>
          <button 
            className="property-edit"
            onClick={(e) => {
              e.stopPropagation();
              startEditingName(propName);
            }}
            title="Редактировать имя"
          >
            <FaEdit />
          </button>
          <button 
            className="property-duplicate"
            onClick={(e) => {
              e.stopPropagation();
              handleDuplicateProperty(propName);
            }}
            title="Дублировать свойство"
          >
            <FaCopy />
          </button>
          <button 
            className="property-move-up"
            onClick={(e) => {
              e.stopPropagation();
              handleMoveProperty(propName, 'up');
            }}
            title="Переместить вверх"
            disabled={index === 0}
          >
            <FaArrowUp />
          </button>
          <button 
            className="property-move-down"
            onClick={(e) => {
              e.stopPropagation();
              handleMoveProperty(propName, 'down');
            }}
            title="Переместить вниз"
            disabled={index === arr.length - 1}
          >
            <FaArrowDown />
          </button>
          <button 
            className="property-delete"
            onClick={(e) => {
              e.stopPropagation();
              const { [propName]: _, ...rest } = data.properties;
              onChange({ ...data, properties: rest });
            }}
            title="Удалить свойство"
          >
            <FaTimes />
          </button>
        </>
      )}
    </div>
  );

  // Рендер компонента
  return (
    <div className={`json-form-editor ${isSchema ? 'schema-editor-form' : ''}`}>
      {isSchema && data.properties && (
        <div className="schema-properties">
          <div className="property-filter-container">
            <input
              type="text"
              placeholder="Фильтр свойств..."
              value={propertyFilter}
              onChange={(e) => setPropertyFilter(e.target.value)}
              className="property-filter"
            />
          </div>
          
          {Object.entries(data.properties)
            .filter(([propName]) => 
              propName.toLowerCase().includes(propertyFilter.toLowerCase())
            )
            .map(([propName, propSchema], index, arr) => (
              <div key={propName} className="property-editor-collapsible">
                <div className="property-header">
                  {editingPropName === propName 
                    ? renderPropertyNameEditor(propName)
                    : renderPropertyNameView(propName)
                  }
                  {renderPropertyActions(propName, index, arr)}
                </div>
                
                {!collapsedProperties.includes(propName) && (
                  <JsonFormEditor 
                    data={propSchema} 
                    onChange={(newSchema) => {
                      const updatedProperties = {
                        ...data.properties,
                        [propName]: newSchema
                      };
                      onChange({ ...data, properties: updatedProperties });
                    }}
                    isSchema={true}
                    parentData={data}
                    onPropertyChange={(newSchema) => {
                      const updatedProperties = {
                        ...data.properties,
                        [propName]: newSchema
                      };
                      onChange({ ...data, properties: updatedProperties });
                    }}
                    showTempMessage={showTempMessage}
                  />
                )}
              </div>
            ))}
        </div>
      )}
    </div>
  );
};

const AddPropertyPanel = ({ onAdd }) => {
  const [newPropName, setNewPropName] = useState('');
  const [newPropType, setNewPropType] = useState('string');
  const [isEditing, setIsEditing] = useState(false);

  const handleAdd = () => {
    if (!newPropName.trim()) {
      setNewPropName('');
      return;
    }
    
    const newProperty = { type: newPropType };
    if (newPropType === 'object') {
      newProperty.properties = {};
    } else if (newPropType === 'array') {
      newProperty.items = { type: 'string' };
    }
    
    onAdd(newPropName, newProperty);
    setNewPropName('');
    setNewPropType('string');
  };

  return (
    <div className="add-property-panel">
      <input
        type="text"
        value={newPropName}
        onChange={(e) => setNewPropName(e.target.value)}
        placeholder="Имя свойства"
        onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
      />
      <select
        value={newPropType}
        onChange={(e) => setNewPropType(e.target.value)}
      >
        <option value="string">строка</option>
        <option value="number">число</option>
        <option value="integer">целое</option>
        <option value="boolean">логический</option>
        <option value="array">массив</option>
        <option value="object">объект</option>
      </select>
      <button onClick={handleAdd}>
        <FaPlus /> Добавить
      </button>
    </div>
  );
};

// Основной компонент JSON редактора
const JsonEditor = forwardRef((props, ref) => {
  const [propertyFilter, setPropertyFilter] = useState('');
  const [collapsedProperties, setCollapsedProperties] = useState([]);
  const [validationErrors, setValidationErrors] = useState({});
  const [formHeight, setFormHeight] = useState('300px');
  const [isResizingForm, setIsResizingForm] = useState(false);
  const [formStartY, setFormStartY] = useState(0);
  const [formStartHeight, setFormStartHeight] = useState(0);
  // Состояния редактора
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTitle, setActiveTitle] = useState(null);
  const [activeIsServer, setActiveIsServer] = useState(false);
  const [editorHeight, setEditorHeight] = useState('300px');
  const [isResizingEditor, setIsResizingEditor] = useState(false);
  const [startY, setStartY] = useState(0);
  const [startHeight, setStartHeight] = useState(0);
  const [fontSize, setFontSize] = useState(() => {
    return localStorage.getItem("jsonEditorFontSize") || '14px';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [currentResultIndex, setCurrentResultIndex] = useState(0);
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
  const [tempMessage, setTempMessage] = useState(null);
  const [messageTimeout, setMessageTimeout] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [filterText, setFilterText] = useState('');
  const [filterKey, setFilterKey] = useState('');
  const [originalJson, setOriginalJson] = useState('');
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("jsonEditorTheme") || 'dark';
  });

  // Рефы
  const containerRef = useRef(null);
  const editorRef = useRef(null);
  const schemaEditorRef = useRef(null);
  const ajv = new Ajv();

  const startResizeForm = (e) => {
    setIsResizingForm(true);
    setFormStartY(e.clientY);
    const wrapper = e.target.closest('.form-editor-container');
    setFormStartHeight(parseInt(window.getComputedStyle(wrapper).height));
    e.preventDefault();
    e.stopPropagation();
  };

  const resizeForm = useCallback((e) => {
    if (!isResizingForm) return;
    
    const dy = e.clientY - formStartY;
    const newHeight = Math.max(150, Math.min(600, formStartHeight + dy));
    setFormHeight(`${newHeight}px`);
  }, [isResizingForm, formStartY, formStartHeight]);

  const stopResizeForm = useCallback(() => {
    if (isResizingForm) {
      setIsResizingForm(false);
      localStorage.setItem("jsonEditorFormHeight", formHeight);
    }
  }, [isResizingForm, formHeight]);

  // Вспомогательные функции
  const showTempMessage = (text, type, duration = 3000) => {
    if (messageTimeout) {
      clearTimeout(messageTimeout);
    }
    
    setTempMessage({ text, type });
    
    const timeout = setTimeout(() => {
      setTempMessage(null);
    }, duration);
    
    setMessageTimeout(timeout);
  };

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      const currentSize = {
        width: containerRef.current.offsetWidth,
        height: containerRef.current.offsetHeight
      };
      const currentPos = { ...position };
      localStorage.setItem('jsonEditorPreFullscreenSize', JSON.stringify(currentSize));
      localStorage.setItem('jsonEditorPreFullscreenPos', JSON.stringify(currentPos));
      
      containerRef.current.style.width = '100vw';
      containerRef.current.style.height = '100vh';
      containerRef.current.style.left = '0';
      containerRef.current.style.top = '0';
      containerRef.current.style.borderRadius = '0';
    } else {
      const savedSize = JSON.parse(localStorage.getItem('jsonEditorPreFullscreenSize') || '{"width":500,"height":"70vh"}');
      const savedPos = JSON.parse(localStorage.getItem('jsonEditorPreFullscreenPos') || '{"x":0,"y":0}');
      
      containerRef.current.style.width = `${savedSize.width}px`;
      containerRef.current.style.height = savedSize.height;
      setPosition(savedPos);
      containerRef.current.style.borderRadius = '8px';
    }
    
    setIsFullscreen(!isFullscreen);
  };

  // Функции для работы с редактором
  const startResizeEditor = (e) => {
    setIsResizingEditor(true);
    setStartY(e.clientY);
    const wrapper = e.target.closest('.code-editor-wrapper');
    setStartHeight(parseInt(window.getComputedStyle(wrapper).height));
    e.preventDefault();
    e.stopPropagation();
  };

  const resizeEditor = useCallback((e) => {
    if (!isResizingEditor) return;
    
    const dy = e.clientY - startY;
    const newHeight = Math.max(150, Math.min(600, startHeight + dy));
    setEditorHeight(`${newHeight}px`);
  }, [isResizingEditor, startY, startHeight]);

  const stopResizeEditor = useCallback(() => {
    if (isResizingEditor) {
      setIsResizingEditor(false);
      localStorage.setItem("jsonEditorHeight", editorHeight);
    }
  }, [isResizingEditor, editorHeight]);

  // Функции для работы с реестром
  const startEditingPairName = (pair) => {
    setEditingPairId(pair.id);
    setEditingPairName(pair.name);
  };
  
  const savePairName = async (id) => {
    const pair = registry.find(p => p.id === id);
    if (!pair) return;

    if (isAuthenticated && pair.server) {
      try {
        const host = localStorage.getItem("jsonEditorHost") || "http://localhost:3000";
        const sessionId = localStorage.getItem('jsonEditorSessionId');
        const response = await fetch(host + '/api/rename-json', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-session-id': sessionId
          },
          body: JSON.stringify({
            oldTitle: pair.name,
            newTitle: editingPairName
          })
        });

        if (!response.ok) throw new Error('Ошибка переименования на сервере');

        showTempMessage("Название обновлено (сервер)", "success");
        setActiveTitle(editingPairName);
        loadServerRegistry();
      } catch (err) {
        showTempMessage(err.message, "error");
      }
    } else {
      const updatedRegistry = registry.map(item =>
        item.id === id ? { ...item, name: editingPairName } : item
      );

      setRegistry(updatedRegistry);
      localStorage.setItem("jsonEditorRegistry", JSON.stringify(updatedRegistry));
      if (activePairId === id) {
        setActiveTitle(editingPairName);
      }
      showTempMessage("Название обновлено (локально)", "success");
    }

    setEditingPairId(null);
    setEditingPairName('');
  };
  
  const cancelEditingPairName = () => {
    setEditingPairId(null);
    setEditingPairName('');
  };

  const saveToRegistry = async () => {
    const isNew = !activeTitle;
    const title = isNew ? `JSON ${new Date().toLocaleString()}` : activeTitle;

    if (isAuthenticated) {
      try {
        const host = localStorage.getItem("jsonEditorHost") || "http://localhost:3000";
        const sessionId = localStorage.getItem('jsonEditorSessionId');
        
        const response = await fetch(`${host}/api/save`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-session-id': sessionId
          },
          body: JSON.stringify({
            title,
            data: JSON.parse(jsonValue),
            schema: schemaValue ? JSON.parse(schemaValue) : null
          })
        });

        if (!response.ok) throw new Error(await response.text());

        showTempMessage(isNew ? 'Сохранено на сервере!' : 'Обновлено на сервере!', "success");
        await loadServerRegistry();

        if (isNew) {
          setActiveTitle(title);
          setActiveIsServer(true);
          setActivePairId(title);
        }
        return;
      } catch (err) {
        console.error("Server save failed, falling back to local", err);
        showTempMessage(`${err.message} → Сохранено локально`, "warning");
      }
    }

    const newPair = {
      id: isNew ? Date.now() : activePairId,
      json: jsonValue,
      schema: schemaValue,
      name: title,
      createdAt: new Date().toISOString(),
      server: false
    };

    const updatedRegistry = isNew
      ? [...registry, newPair]
      : registry.map(item => item.id === activePairId ? newPair : item);

    setRegistry(updatedRegistry);
    localStorage.setItem("jsonEditorRegistry", JSON.stringify(updatedRegistry));

    if (isNew) {
      setActivePairId(newPair.id);
      setActiveTitle(title);
      setActiveIsServer(false);
    }

    showTempMessage(isNew ? "Сохранено локально!" : "Обновлено локально!", "success");
  };

  const loadServerRegistry = async () => {
    try {
      const host = localStorage.getItem("jsonEditorHost") || "http://localhost:3000";
      const sessionId = localStorage.getItem('jsonEditorSessionId');
      const response = await fetch(host + '/api/list-json-titles', {
        headers: { 'x-session-id': sessionId }
      });

      if (!response.ok) throw new Error('Ошибка при получении списка');

      const list = await response.json();

      const serverRegistry = list.map(item => ({
        id: item.title,
        name: item.title,
        createdAt: item.updatedAt,
        server: true
      }));

      setRegistry(serverRegistry);
    } catch (err) {
      console.error('❌ Ошибка загрузки списка:', err);
      showTempMessage('Не удалось загрузить сохранения с сервера', "error");
    }
  };
  
  const loadFromRegistry = async (id) => {
    const pair = registry.find(item => item.id === id);
    if (!pair) return;

    if (pair.server) {
      try {
        const host = localStorage.getItem("jsonEditorHost") || "http://localhost:3000";
        const sessionId = localStorage.getItem('jsonEditorSessionId');
        const response = await fetch(host + `/api/get-json/${pair.name}`, {
          headers: { 'x-session-id': sessionId }
        });

        if (!response.ok) throw new Error('Не удалось загрузить с сервера');

        const { json, schema } = await response.json();
        setJsonValue(JSON.stringify(json, null, 2));
        setSchemaValue(JSON.stringify(schema || {}, null, 2));
        setOriginalJson(JSON.stringify(json, null, 2));
        setActivePairId(id);
        setActiveTitle(pair.name);
        setActiveIsServer(true);
        showTempMessage('Загружено с сервера!', "success");
      } catch (err) {
        showTempMessage(err.message, "error");
      }
    } else {
      setJsonValue(pair.json);
      setSchemaValue(pair.schema);
      setOriginalJson(pair.json);
      setActivePairId(id);
      setActiveTitle(pair.name);
      setActiveIsServer(false);
      showTempMessage('Загружено из локального хранилища', "success");
    }
  };

  const updateRegistryPair = useCallback(() => {
    if (!activePairId) return;
    
    const updatedRegistry = registry.map(item => 
      item.id === activePairId 
        ? { 
            ...item, 
            json: jsonValue, 
            schema: schemaValue,
            updatedAt: new Date().toISOString()
          } 
        : item
    );
    
    setRegistry(updatedRegistry);
    localStorage.setItem("jsonEditorRegistry", JSON.stringify(updatedRegistry));
    showTempMessage("JSON обновлен в регистре!", "success");
  }, [activePairId, jsonValue, schemaValue, registry]);

  const resetEditor = useCallback(() => {
    setActivePairId(null);
    setJsonValue(`{\n  "example": "data"\n}`);
    setSchemaValue(`{\n  "type": "object",\n  "properties": {}\n}`);
    setActiveTitle(null);
    setActiveIsServer(false);
    setOriginalJson('');
    setMessage(null);
    setSortConfig({ key: null, direction: 'asc' });
    setFilterText('');
    setFilterKey('');
  }, []);
  
  const deleteFromRegistry = async (id) => {
    const pair = registry.find(p => p.id === id);
    if (!pair) return;

    const resetActiveEditor = () => {
      if (activePairId === id) {
        resetEditor();
      }
    };

    if (isAuthenticated && pair.server) {
      try {
        const host = localStorage.getItem("jsonEditorHost") || "http://localhost:3000";
        const sessionId = localStorage.getItem('jsonEditorSessionId');
        const response = await fetch(`${host}/api/delete-json/${encodeURIComponent(pair.name)}`, {
          method: 'DELETE',
          headers: {
            'x-session-id': sessionId,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Ошибка удаления с сервера');
        }

        showTempMessage('Удалено с сервера!', "success");
        resetActiveEditor();
        loadServerRegistry();
      } catch (err) {
        showTempMessage(err.message, "error");
        console.error('Delete error:', err);
      }
    } else {
      const updatedRegistry = registry.filter(item => item.id !== id);
      setRegistry(updatedRegistry);
      localStorage.setItem("jsonEditorRegistry", JSON.stringify(updatedRegistry));
      
      showTempMessage("Удалено локально", "success");
      resetActiveEditor();
    }
  };

  // Функции для работы с JSON
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
      showTempMessage("Схема успешно сгенерирована!", "success");
    } catch (error) {
      showTempMessage(`Ошибка генерации: ${error.message}`, "error");
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
        showTempMessage("JSON соответствует схеме!", "success");
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

  const handleRegistryItemClick = (id) => {
    if (activePairId === id) {
      resetEditor();
    } else {
      loadFromRegistry(id);
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

  // Функции для работы с редактором кода
  const handleFormat = () => {
    try {
      const formatted = activeTab === 'json' 
        ? JSON.stringify(JSON.parse(jsonValue), null, 2)
        : JSON.stringify(JSON.parse(schemaValue), null, 2);
      
      activeTab === 'json' ? setJsonValue(formatted) : setSchemaValue(formatted);
      showTempMessage(`Форматирование ${activeTab === 'json' ? 'JSON' : 'Схема'} выполнено успешно!`, "success");
    } catch (error) {
      showTempMessage(`Ошибка форматирования: ${error.message}`, "error");
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
        showTempMessage(`Скопировано ${activeTab === 'json' ? 'JSON' : 'Схема'} в буфер обмена!`, "success");
      })
      .catch(() => {
        showTempMessage(`Не удалось скопировать ${activeTab === 'json' ? 'JSON' : 'схему'}`, "error");
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
        
        showTempMessage("Файл успешно загружен!", "success");
      } catch (error) {
        showTempMessage(`Ошибка загрузки файла: ${error.message}`, "error");
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
      
      showTempMessage("Файл успешно сохранён!", "success");
    } catch (error) {
      showTempMessage(`Ошибка сохранения файла: ${error.message}`, "error");
    }
  };

  // Функции для работы с поиском
  const handleSearch = useCallback(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setCurrentResultIndex(0);
      return;
    }

    try {
      const content = activeTab === 'json' ? jsonValue : schemaValue;
      const lines = content.split('\n');
      const results = [];

      lines.forEach((line, lineIndex) => {
        const index = line.toLowerCase().indexOf(searchQuery.toLowerCase());
        if (index !== -1) {
          results.push({
            line: lineIndex + 1,
            from: index,
            to: index + searchQuery.length,
            lineText: line
          });
        }
      });

      setSearchResults(results);
      setCurrentResultIndex(0);
      
      if (results.length > 0) {
        setMessage({ text: `Найдено ${results.length} совпадений`, type: "success" });
        scrollToResult(results[0]);
      } else {
        setMessage({ text: "Совпадений не найдено", type: "info" });
      }
    } catch (error) {
      setMessage({ text: `Ошибка поиска: ${error.message}`, type: "error" });
    }
  }, [searchQuery, jsonValue, schemaValue, activeTab]);

  const scrollToResult = (result) => {
    const editor = activeTab === 'json' ? editorRef.current : schemaEditorRef.current;
    if (editor && editor.view) {
      const pos = editor.view.state.doc.line(result.line).from + result.from;
      editor.view.dispatch({
        selection: { anchor: pos, head: pos + searchQuery.length },
        scrollIntoView: true
      });
    }
  };

  const handleNextResult = () => {
    if (searchResults.length === 0) return;
    const nextIndex = (currentResultIndex + 1) % searchResults.length;
    setCurrentResultIndex(nextIndex);
    scrollToResult(searchResults[nextIndex]);
  };

  const handlePrevResult = () => {
    if (searchResults.length === 0) return;
    const prevIndex = (currentResultIndex - 1 + searchResults.length) % searchResults.length;
    setCurrentResultIndex(prevIndex);
    scrollToResult(searchResults[prevIndex]);
  };

  // Функции для работы с размерами и позиционированием
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

  const handleFontSizeChange = (size) => {
    setFontSize(size);
    localStorage.setItem("jsonEditorFontSize", size);
  };

  useEffect(() => {
    const handleMouseMove = (e) => resizeForm(e);
    const handleMouseUp = () => stopResizeForm();

    if (isResizingForm) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.classList.add('no-select');
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.classList.remove('no-select');
    };
  }, [isResizingForm, resizeForm, stopResizeForm]);

  useEffect(() => {
    const savedHeight = localStorage.getItem("jsonEditorFormHeight");
    if (savedHeight) {
      setFormHeight(savedHeight);
    }
  }, []);

  // Эффекты
  useEffect(() => {
    const handleMouseMove = (e) => resizeEditor(e);
    const handleMouseUp = () => stopResizeEditor();

    if (isResizingEditor) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.classList.add('no-select');
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.classList.remove('no-select');
    };
  }, [isResizingEditor, resizeEditor, stopResizeEditor]);

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
    const validate = () => {
      try {
        if (activeTab === 'json') {
          JSON.parse(jsonValue);
          if (!tempMessage) {
            setMessage({ text: "Ошибок в JSON не найдено!", type: "success" });
          }
        } else {
          JSON.parse(schemaValue);
          if (!tempMessage) {
            setMessage({ text: "Ошибок в JSON Schema не найдено!", type: "success" });
          }
        }
      } catch (error) {
        setMessage({ 
          text: `Ошибка в ${activeTab === 'json' ? 'JSON' : 'JSON Schema'}: ${error.message}`, 
          type: "error" 
        });
      }
    };

    validate();
  }, [jsonValue, schemaValue, activeTab, tempMessage]);

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
    return () => {
      if (messageTimeout) {
        clearTimeout(messageTimeout);
      }
    };
  }, [messageTimeout]);

  // API и методы для ref
  useImperativeHandle(ref, () => ({
    setUserToken: (token) => {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        
        localStorage.setItem('jsonEditorUserToken', token);
        localStorage.setItem('jsonEditorUserId', payload.id);
        
        return Promise.resolve({ 
          result: 'success', 
          userId: payload.id 
        });
      } catch (e) {
        return Promise.resolve({ 
          result: 'fail', 
          message: e.message 
        });
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
      isOpen: () => isExpanded,
      setUserToken: async (token) => {
        try {
          const host = localStorage.getItem("jsonEditorHost") || "http://localhost:3000";
          const widgetId = localStorage.getItem('jsonEditorWidgetId') || 'dd032b7d-a2b7-42e0-b9d5-0de1ec502660';

          localStorage.setItem('jsonEditorUserToken', token);

          console.log('Sending widgetId:', widgetId, 'Type:', typeof widgetId);

          const response = await fetch(host + '/auth', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token, widgetId }),
          });

          if (!response.ok) {
            const error = await response.json();
            return {
              result: 'fail',
              message: error?.error || 'Auth failed',
            };
          }

          const data = await response.json();

          let userId = null;
          if (token.startsWith('valid_')) {
            userId = token.split('_')[1];
          } else {
            const payload = JSON.parse(atob(token.split('.')[1]));
            userId = payload.id;
          }

          localStorage.setItem('jsonEditorUserId', userId);
          localStorage.setItem('jsonEditorSessionId', data.sessionId);

          setIsAuthenticated(true);
          loadServerRegistry();

          return {
            result: 'success',
            userId,
            sessionId: data.sessionId,
          };

        } catch (e) {
          return {
            result: 'fail',
            message: e.message,
          };
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

  // Рендер компонента
  return (
    <>
      {!isExpanded && (
        <div 
          className="json-editor-tab"
          onClick={() => setIsExpanded(true)}
          title="Открыть JSON редактор"
        >
          <FaFileAlt />
          <span>JSON Редактор</span>
        </div>
      )}

      {isExpanded && (
        <>
          <div 
            className={`editor-overlay ${isExpanded ? 'visible' : ''}`}
            onClick={() => setIsExpanded(false)}
          />
          <div 
            className={`json-editor-container ${themes[theme].containerClass} ${isExpanded ? 'expanded' : ''} ${isDragging ? 'dragging' : ''} ${isResizing ? 'resizing' : ''}`}
            ref={containerRef}
            style={{
              left: isExpanded ? `${position.x}px` : 'auto',
              top: isExpanded ? `${position.y}px` : 'auto',
              width: isExpanded ? startSize.width : 'auto',
              height: isExpanded ? startSize.height : 'auto',
              transform: isDragging ? 'none' : 'translateX(0)',
              cursor: isOverDragHandle ? 'move' : 'default'
            }}
          >
            <div className="drag-handle" />
            
            <button 
              className="close-editor"
              onClick={() => setIsExpanded(false)}
              title="Закрыть редактор"
            >
              <FaTimes />
            </button>

            <button 
              className="fullscreen-button"
              onClick={toggleFullscreen}
              title={isFullscreen ? "Выйти из полноэкранного режима" : "Развернуть на весь экран"}
            >
              {isFullscreen ? <FaCompress /> : <FaExpand />}
            </button>
            
            <div className="theme-switcher">
              <button 
                onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                title={theme === 'light' ? 'Переключить на тёмную тему' : 'Переключить на светлую тему'}
              >
                {theme === 'light' ? <FaMoon /> : <FaSun />}
              </button>
            </div>

            <div className="tabs">
              <button 
                className={activeTab === 'json' ? 'active' : ''}
                onClick={() => setActiveTab('json')}
              >
                <FaFileAlt /> Документ
              </button>
              <button 
                className={activeTab === 'schema' ? 'active' : ''}
                onClick={() => setActiveTab('schema')}
              >
                <MdOutlineRule /> Схема
              </button>
            </div>

            <div className="editor-section">
              <div className="editor-header"
                onMouseEnter={() => setIsOverDragHandle(true)}
                onMouseLeave={() => setIsOverDragHandle(false)}
                onMouseDown={handleMouseDown}
              >
                <h3>
                  {activeTab === 'json' ? (
                    <></>
                  ) : (
                    <></>
                  )}
                </h3>
                 
                <div className="header-actions">
                  <div className="editor-mode-switcher">
                    <button 
                      onClick={() => setEditMode('code')} 
                      className={editMode === 'code' ? 'active' : ''}
                    >
                      <FaCode /> Код
                    </button>
                    <button 
                      onClick={() => setEditMode('form')} 
                      className={editMode === 'form' ? 'active' : ''}
                    >
                      <FaEdit /> Форма
                    </button>
                  </div>      

                  <div className="search-controls">
                    <input
                      type="text"
                      placeholder="Поиск..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                    <SmallButton
                      icon={<FaSearch />}
                      label="Найти"
                      onClick={handleSearch}
                    />
                    {searchResults.length > 0 && (
                      <>
                        <SmallButton
                          icon={<FaChevronUp />}
                          label="Предыдущее"
                          onClick={handlePrevResult}
                        />
                        <SmallButton
                          icon={<FaChevronDown />}
                          label="Следующее"
                          onClick={handleNextResult}
                        />
                        <span className="search-counter">
                          {currentResultIndex + 1}/{searchResults.length}
                        </span>
                      </>
                    )}
                  </div>

                  <div className="basic-actions">
                    <SmallButton 
                      icon={<FaFileUpload />}
                      label="Загрузить из файла"
                      onClick={() => document.getElementById('file-upload').click()}
                    />
                    <SmallButton 
                      icon={<FaFileDownload />}
                      label="Сохранить в файл"
                      onClick={handleFileDownload}
                    />
                    <SmallButton 
                      icon={<FaCopy />}
                      label="Копировать"
                      onClick={handleCopyToClipboard}
                    />
                    <SmallButton 
                      icon={<FaUndo />}
                      label="Отменить"
                      onClick={handleUndo}
                    />
                    <SmallButton 
                      icon={<FaRedo />}
                      label="Повторить"
                      onClick={handleRedo}
                    />
                  </div>

                  {editMode === 'code' && (
                    <div className="font-size-controls">
                      <SmallButton 
                        icon={<FaMinus />}
                        label="Уменьшить шрифт"
                        onClick={() => {
                          const currentSize = parseInt(fontSize);
                          if (currentSize > 10) {
                            handleFontSizeChange(`${currentSize - 1}px`);
                          }
                        }}
                      />
                      <span className="font-size-display">{fontSize}</span>
                      <SmallButton 
                        icon={<FaPlus />}
                        label="Увеличить шрифт"
                        onClick={() => {
                          const currentSize = parseInt(fontSize);
                          if (currentSize < 24) {
                            handleFontSizeChange(`${currentSize + 1}px`);
                          }
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {editMode === 'code' ? (
                <div 
                  className={`code-editor-wrapper ${isResizingEditor ? 'resizing' : ''}`}
                  style={{ height: editorHeight }}
                >
                  <div className="code-editor-container">
                    <CodeMirror 
                      value={activeTab === 'json' ? jsonValue : schemaValue}
                      height="100%"
                      theme={themes[theme].cmTheme} 
                      extensions={extensions} 
                      onChange={activeTab === 'json' ? setJsonValue : setSchemaValue}
                      ref={activeTab === 'json' ? editorRef : schemaEditorRef}
                      style={{ fontSize: fontSize }}
                    />
                  </div>
                  <div 
                    className="editor-resize-handle"
                    onMouseDown={startResizeEditor}
                    title="Перетащите для изменения высоты"
                  />
                </div>
              ) : (
                <div 
                  className={`form-editor-container ${isResizingForm ? 'resizing' : ''}`}
                  style={{ height: formHeight }}
                >
                  {activeTab === 'json' ? (
                    <JsonFormEditor 
                      data={jsonData} 
                      onChange={handleJsonChange}
                      isSchema={false}
                      parentData={jsonData}
                      onPropertyChange={handleJsonChange} 
                      onSort={handleSort}
                      onFilter={handleFilter}
                      sortConfig={sortConfig}
                      filterText={filterText}
                      filterKey={filterKey}
                      onFilterChange={handleFilterChange}
                      showTempMessage={showTempMessage} 
                    />
                  ) : (
                    <JsonFormEditor 
                      data={schemaData} 
                      onChange={handleSchemaChange}
                      isSchema={true}
                      parentData={schemaData} // Добавляем parentData
                      onPropertyChange={handleSchemaChange} // Добавляем новый пропс
                      showTempMessage={showTempMessage} 
                    />
                  )}
                  <div 
                    className="form-editor-resize-handle"
                    onMouseDown={startResizeForm}
                    title="Перетащите для изменения высоты"
                  />
                </div>
              )}

              {(tempMessage || message) && (
                <div className={`message ${(tempMessage || message).type}`}>
                  {(tempMessage || message).type === 'success' ? <FaCheck /> : <FaTimes />}
                  <span>{(tempMessage || message).text}</span>
                </div>
              )}

              <div className="editor-actions">
                <div className="specific-actions">
                  {activeTab === 'json' ? (
                    <>
                      <EditorButton 
                        icon={<FaMagic />}
                        label="Сгенерировать схему"
                        onClick={generateSchemaFromJson}
                      />
                      <EditorButton 
                        icon={<FaSave />}
                        label="Сохранить"
                        onClick={saveToRegistry}
                      />
                      <EditorButton 
                        icon={<FaSlidersH />}
                        label="Форматировать"
                        onClick={handleFormat}
                      />
                      <EditorButton 
                        icon={<FaTimes />}
                        label="Очистить"
                        onClick={handleClear}
                      />
                    </>
                  ) : (
                    <EditorButton 
                      icon={<FaCheckCircle />}
                      label="Проверить JSON"
                      onClick={validateJsonAgainstSchema}
                    />
                  )}
                </div>

                {activeTab === 'json' && (
                <div className="array-tools">
                  <select
                    value={sortConfig.key || ''}
                    onChange={(e) => isJsonArray() && handleSort(e.target.value)}
                    className="sort-select"
                    disabled={!isJsonArray()}
                  >
                    <option value="">Сортировать по...</option>
                    {isJsonArray() && getArrayKeys().map(k => (
                      <option key={k} value={k}>{k}</option>
                    ))}
                  </select>
                  
                  {sortConfig.key && isJsonArray() && (
                    <SmallButton
                      icon={sortConfig.direction === 'asc' ? <FaSortUp /> : <FaSortDown />}
                      onClick={() => handleSort(sortConfig.key)}
                      title={`Сортировка ${sortConfig.direction === 'asc' ? 'по убыванию' : 'по возрастанию'}`}
                    />
                  )}

                  <input
                    type="text"
                    placeholder="Фильтр..."
                    value={filterText}
                    onChange={(e) => handleFilterChange('text', e.target.value)}
                    className="filter-input"
                    disabled={!isJsonArray()}
                  />

                  <select
                    value={filterKey}
                    onChange={(e) => handleFilterChange('key', e.target.value)}
                    className="filter-key-select"
                    disabled={!isJsonArray()}
                  >
                    <option value="">Все поля</option>
                    {isJsonArray() && getArrayKeys().map(k => (
                      <option key={k} value={k}>{k}</option>
                    ))}
                  </select>

                  <SmallButton
                    icon={<FaSearch />}
                    onClick={isJsonArray() ? handleFilter : undefined}
                    disabled={!isJsonArray()}
                    title={isJsonArray() ? "Применить фильтр" : "Доступно только для массивов"}
                  />

                  {(filterText || filterKey) && isJsonArray() && (
                    <SmallButton
                      icon={<FaTimes />}
                      onClick={() => handleFilterChange('reset')}
                      title="Сбросить фильтр"
                    />
                  )}
                </div>
                )}
                
                {activeTab === 'json' && !isJsonArray() && (
                  <div className="tooltip" style={{
                    color: '#aaa',
                    fontSize: '12px',
                    marginTop: '5px',
                    padding: '0 10px',
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    <FaInfoCircle style={{marginRight: '5px', fontSize: '14px'}}/>
                    Инструменты сортировки и фильтрации доступны только для массивов JSON
                  </div>
                )}
              </div>

              <input 
                type="file" 
                id="file-upload" 
                accept=".json" 
                onChange={handleFileUpload} 
                style={{ display: 'none' }} 
              />
            </div>
            <div className="registry-panel">
              <div className="registry-header">
                <h3><FaList /> Сохраненное</h3>
                <div className="registry-actions">
                  <SmallButton 
                    icon={<FaPlus />}
                    label="Добавить текущее"
                    onClick={saveToRegistry}
                  />
                  {activePairId && (
                    <SmallButton 
                      icon={<FaCheck />}
                      label="Обновить текущее"
                      onClick={updateRegistryPair}
                    />
                  )}
                </div>
              </div>
              
              <div className="registry-list">
                {registry.length === 0 ? (
                  <div className="registry-empty">Нет сохранённых данных</div>
                ) : (
                  registry.map(pair => (
                    <div 
                      key={pair.id} 
                      className={`registry-item ${activePairId === pair.id ? 'active' : ''}`}
                      onClick={() => handleRegistryItemClick(pair.id)}
                      title={activePairId === pair.id ? "Нажмите чтобы сбросить выбор" : "Нажмите чтобы загрузить"}
                    >
                      {editingPairId === pair.id ? (
                        <div className="registry-item-name-edit">
                          <input
                            type="text"
                            value={editingPairName}
                            onChange={(e) => setEditingPairName(e.target.value)}
                            autoFocus
                          />
                          <div className="registry-item-edit-buttons">
                            <SmallButton 
                              icon={<FaCheck />}
                              label="Сохранить"
                              onClick={() => savePairName(pair.id)}
                            />
                            <SmallButton 
                              icon={<FaTimes />}
                              label="Отмена"
                              onClick={cancelEditingPairName}
                            />
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="registry-item-name">
                            {pair.name}
                          </div>
                          <div className="registry-item-meta">
                            {new Date(pair.createdAt).toLocaleString()}
                          </div>
                          <div className="registry-item-actions">
                            <SmallButton 
                              icon={<FaEdit />}
                              label="Редактировать название"
                              onClick={(e) => {
                                e.stopPropagation();
                                startEditingPairName(pair);
                              }}
                            />
                            <SmallButton 
                              icon={<FaTrash />}
                              label="Удалить"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteFromRegistry(pair.id);
                              }}
                            />
                          </div>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
            {isExpanded && (
              <div 
                className="resize-handle"
                onMouseDown={handleResizeMouseDown}
                title="Изменить размер редактора"
              />
            )}
          </div>
        </>
      )}
    </>
  );
});

export default JsonEditor;