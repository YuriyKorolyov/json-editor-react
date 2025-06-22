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
  FaSlidersH, FaList, FaObjectGroup, FaSort,
  FaSortUp, FaSortDown, FaFilter, FaSearch, FaInfoCircle, FaChevronRight, FaChevronUp, FaChevronDown, FaSun, FaMoon, FaCogs, FaExpand, FaCompress, FaSave 
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

const SCHEMA_CONSTRAINTS = {
  string: {
    minLength: { type: "number", default: 0 },
    maxLength: { type: "number", default: 100 },
    pattern: { type: "string", default: "" },
    format: { 
      type: "select", 
      options: [
        "date", "date-time", "time", 
        "email", "hostname", "ipv4", 
        "ipv6", "uri", "uri-reference",
        "uuid", "json-pointer", "regex"
      ]
    },
    enum: { type: "array", default: [] }
  },
  number: {
    minimum: { type: "number", default: 0 },
    maximum: { type: "number", default: 100 },
    exclusiveMinimum: { type: "boolean", default: false },
    exclusiveMaximum: { type: "boolean", default: false },
    multipleOf: { type: "number", default: 1 }
  },
  integer: {
    minimum: { type: "number", default: 0 },
    maximum: { type: "number", default: 100 },
    exclusiveMinimum: { type: "boolean", default: false },
    exclusiveMaximum: { type: "boolean", default: false },
    multipleOf: { type: "integer", default: 1 }
  },
  array: {
    minItems: { type: "number", default: 0 },
    maxItems: { type: "number", default: 10 },
    uniqueItems: { type: "boolean", default: false },
    items: { type: "schema", default: {} },
    contains: { type: "schema", default: {} }
  },
  object: {
    minProperties: { type: "number", default: 0 },
    maxProperties: { type: "number", default: 10 },
    required: { type: "array", default: [] },
    properties: { type: "object", default: {} },
    patternProperties: { type: "object", default: {} },
    additionalProperties: { type: "boolean", default: true },
    dependencies: { type: "object", default: {} },
    propertyNames: { type: "schema", default: {} }
  },
  boolean: {},
  null: {}
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
  onSort, 
  onFilter, 
  sortConfig, 
  filterText, 
  filterKey, 
  onFilterChange 
}) => {
  const [editingProperty, setEditingProperty] = useState(null);
  const [newPropertyName, setNewPropertyName] = useState('');
  const [collapsedProperties, setCollapsedProperties] = useState({});

  const shouldShowSchemaField = (field) => {
    return isSchema && (data[field] !== undefined || field === 'type' || field === 'properties');
  };

  const formatDateTimeForInput = (isoString) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return isoString;
      
      const pad = (num) => num.toString().padStart(2, '0');
      return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
    } catch {
      return isoString;
    }
  };

  const parseDateTimeFromInput = (inputValue) => {
    if (!inputValue) return '';
    return `${inputValue}:00Z`; // Добавляем секунды и часовой пояс
  };

  const renderConstraints = (propertyType, currentSchema, onChangeConstraints) => {
    if (!propertyType || !SCHEMA_CONSTRAINTS[propertyType]) return null;

    const availableConstraints = SCHEMA_CONSTRAINTS[propertyType];
    const currentConstraints = Object.keys(currentSchema || {}).filter(
      key => availableConstraints[key] !== undefined
    );

    return (
      <div className="constraints-editor">
        {/* Показываем текущие ограничения */}
        {currentConstraints.map(constraint => (
          <div key={constraint} className="constraint-field">
            <label>{constraint}</label>
            {renderConstraintInput(
              constraint,
              availableConstraints[constraint],
              currentSchema[constraint],
              (value) => {
                onChangeConstraints({ [constraint]: value });
              }
            )}
            <SmallButton
              icon={<FaTimes />}
              onClick={() => {
                const { [constraint]: _, ...rest } = currentSchema;
                onChangeConstraints(rest);
              }}
            />
          </div>
        ))}

        {/* Кнопка добавления нового ограничения */}
        <select
          value=""
          onChange={(e) => {
            const constraint = e.target.value;
            if (constraint) {
              onChangeConstraints({
                [constraint]: availableConstraints[constraint].default
              });
            }
          }}
        >
          <option value="">Добавить ограничение...</option>
          {Object.keys(availableConstraints)
            .filter(key => !currentConstraints.includes(key))
            .map(key => (
              <option key={key} value={key}>{key}</option>
            ))}
        </select>
      </div>
    );
  };

  const renderConstraintInput = (constraint, constraintDef, value, onChange) => {
    switch (constraintDef.type) {
      case "number":
      case "integer":
        return (
          <input
            type="number"
            value={value ?? constraintDef.default}
            onChange={(e) => onChange(Number(e.target.value))}
          />
        );
      case "boolean":
        return (
          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={value ?? constraintDef.default}
              onChange={(e) => onChange(e.target.checked)}
            />
            <span>{value ? 'true' : 'false'}</span>
          </label>
        );
      case "select":
        return (
          <select
            value={value ?? constraintDef.default}
            onChange={(e) => onChange(e.target.value)}
          >
            {constraintDef.options.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        );
      case "array":
        return (
          <div className="array-field">
            {(value || constraintDef.default || []).map((item, index) => (
              <div key={index} className="array-item">
                <input
                  type="text"
                  value={item}
                  onChange={(e) => {
                    const newArray = [...(value || constraintDef.default || [])];
                    newArray[index] = e.target.value;
                    onChange(newArray);
                  }}
                />
                <SmallButton
                  icon={<FaTimes />}
                  onClick={() => {
                    const newArray = (value || constraintDef.default || []).filter((_, i) => i !== index);
                    onChange(newArray);
                  }}
                />
              </div>
            ))}
            <SmallButton
              icon={<FaPlus />}
              onClick={() => {
                const newArray = [...(value || constraintDef.default || []), ""];
                onChange(newArray);
              }}
            />
          </div>
        );

      case "object":
        return (
          <JsonFormEditor
            data={value || constraintDef.default || {}}
            onChange={onChange}
            isSchema={isSchema}
          />
        );

      case "schema":
        return (
          <JsonFormEditor
            data={value || constraintDef.default || { type: "string" }}
            onChange={onChange}
            isSchema={true}
          />
        );
      default:
        return (
          <input
            type="text"
            value={value ?? constraintDef.default}
            onChange={(e) => onChange(e.target.value)}
          />
        );
    }
  };

  const toggleCollapseProperty = (propName) => {
    setCollapsedProperties(prev => ({
      ...prev,
      [propName]: !prev[propName]
    }));
  };

  const determineFieldType = (key, value) => {
    if (isSchema) {
      if (key === "$schema") return "schema-schema";
      if (key === "title") return "schema-title";
      if (key === "description") return "schema-description";
      if (key === "type") return "schema-type";
      if (key === "properties") return "schema-properties";
      if (key === "required") return "schema-required";
      if (key === "enum") return "enum";
      return "default";
    }

    // Специальные обработки для полей
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

  const handlePropertyRename = (parentKey, oldName, newName) => {
    if (!newName || oldName === newName) {
      setEditingProperty(null);
      return;
    }

    const currentProperties = data[parentKey];
    
    // Используем Map для сохранения порядка
    const propertiesMap = new Map(Object.entries(currentProperties));
    
    // Создаем новый Map с обновленным именем
    const newMap = new Map();
    let renamed = false;
    
    propertiesMap.forEach((value, key) => {
      if (key === oldName) {
        newMap.set(newName, value);
        renamed = true;
      } else {
        newMap.set(key, value);
      }
    });
    
    // Если имя не найдено (на всякий случай)
    if (!renamed) {
      newMap.set(newName, currentProperties[oldName]);
    }
    
    const newProperties = Object.fromEntries(newMap);
    const updatedData = { ...data, [parentKey]: newProperties };
    onChange(updatedData);
    setEditingProperty(null);
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
    const currentProperties = data.properties || {};
    
    // Создаем новый объект с новым свойством в начале
    const newProperties = { 
      [`newProperty${Object.keys(currentProperties).length + 1}`]: { type: "string" },
      ...currentProperties
    };
    
    onChange({ ...data, properties: newProperties });
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
      case 'schema-schema':
      case 'schema-title':
      case 'schema-description':
        return (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => handleChange(key, e.target.value)}
          />
        );
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
            <option value="integer">целое число</option>
            <option value="boolean">логический</option>
            <option value="null">null</option>
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
            {editingProperty === propName ? (
              <input
                type="text"
                value={newPropertyName}
                onChange={(e) => setNewPropertyName(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handlePropertyRename(key, propName, newPropertyName);
                  } else if (e.key === 'Escape') {
                    setEditingProperty(null);
                  }
                }}
              />
            ) : (
              <h4 onClick={() => toggleCollapseProperty(propName)}>
                {propName}
                {collapsedProperties[propName] ? <FaChevronRight /> : <FaChevronDown />}
              </h4>
            )}
            <div className="property-actions">
              {editingProperty === propName ? (
                <>
                  <SmallButton 
                    icon={<FaCheck />}
                    label="Сохранить"
                    onClick={() => handlePropertyRename(key, propName, newPropertyName)}
                  />
                  <SmallButton 
                    icon={<FaTimes />}
                    label="Отмена"
                    onClick={() => setEditingProperty(null)}
                  />
                </>
              ) : (
                <>
                  <SmallButton 
                    icon={<FaEdit />}
                    label="Редактировать имя"
                    onClick={() => {
                      setEditingProperty(propName);
                      setNewPropertyName(propName);
                    }}
                  />
                  <SmallButton 
                    icon={<FaTrash />}
                    label="Удалить свойство"
                    onClick={() => {
                      const { [propName]: _, ...rest } = value;
                      handleChange(key, rest);
                    }}
                  />
                </>
              )}
            </div>
          </div>
          {!collapsedProperties[propName] && (
            <div className="property-content">
              {/* Поле type */}
              <div className="form-field">
                <label>Тип</label>
                {Array.isArray(propSchema.type) ? (
                  <div className="array-field">
                    {propSchema.type.map((type, idx) => (
                      <div key={idx} className="array-item">
                        <select
                          value={type}
                          onChange={(e) => {
                            const newTypes = [...propSchema.type];
                            newTypes[idx] = e.target.value;
                            handleNestedChange(key, propName, {
                              ...propSchema,
                              type: newTypes
                            });
                          }}
                        >
                          <option value="string">строка</option>
                          <option value="number">число</option>
                          <option value="integer">целое число</option>
                          <option value="boolean">логический</option>
                          <option value="array">массив</option>
                          <option value="object">объект</option>
                          <option value="null">null</option>
                        </select>
                        <SmallButton
                          icon={<FaTimes />}
                          onClick={() => {
                            const newTypes = propSchema.type.filter((_, i) => i !== idx);
                            handleNestedChange(key, propName, {
                              ...propSchema,
                              type: newTypes.length > 0 ? newTypes : 'string'
                            });
                          }}
                        />
                      </div>
                    ))}
                    <SmallButton
                      icon={<FaPlus />}
                      onClick={() => {
                        const newTypes = Array.isArray(propSchema.type)
                          ? [...propSchema.type, 'string']
                          : [propSchema.type || 'string', 'string'];
                        handleNestedChange(key, propName, {
                          ...propSchema,
                          type: newTypes
                        });
                      }}
                    />
                  </div>
                ) : (
                  <select
                    value={propSchema.type || 'string'}
                    onChange={(e) => {
                      const newType = e.target.value;
                      handleNestedChange(key, propName, {
                        ...propSchema,
                        type: newType,
                        // Очищаем ограничения при смене типа
                        ...(propSchema.type !== newType 
                          ? Object.fromEntries(
                              Object.keys(SCHEMA_CONSTRAINTS[newType] || {}).map(k => [k, undefined])
                            )
                          : {}
                        )
                      });
                    }}
                  >
                    <option value="string">строка</option>
                    <option value="number">число</option>
                    <option value="integer">целое число</option>
                    <option value="boolean">логический</option>
                    <option value="array">массив</option>
                    <option value="object">объект</option>
                    <option value="null">null</option>
                  </select>
                )}
              </div>

              {/* Описание */}
              {propSchema.description !== undefined && (
                <div className="form-field">
                  <label>Описание</label>
                  <textarea
                    value={propSchema.description || ''}
                    onChange={(e) => handleNestedChange(key, propName, {
                      ...propSchema,
                      description: e.target.value
                    })}
                  />
                  <SmallButton
                    icon={<FaTimes />}
                    onClick={() => {
                      const { description: _, ...rest } = propSchema;
                      handleNestedChange(key, propName, rest);
                    }}
                  />
                </div>
              )}

              {/* Выбор ограничений */}
              <select
                value=""
                onChange={(e) => {
                  const constraint = e.target.value;
                  if (constraint) {
                    const types = Array.isArray(propSchema.type) 
                      ? propSchema.type 
                      : [propSchema.type || 'string'];
                    
                    const validType = types.find(t => SCHEMA_CONSTRAINTS[t]?.[constraint]);
                    
                    if (validType) {
                      handleNestedChange(key, propName, {
                        ...propSchema,
                        [constraint]: SCHEMA_CONSTRAINTS[validType][constraint].default
                      });
                    }
                  }
                }}
                className="constraint-selector"
              >
                <option value="">Добавить ограничение...</option>
                {(() => {
                  const types = Array.isArray(propSchema.type) 
                    ? propSchema.type 
                    : [propSchema.type || 'string'];
                  
                  const allConstraints = new Set();
                  types.forEach(type => {
                    Object.keys(SCHEMA_CONSTRAINTS[type] || {}).forEach(constraint => {
                      if (propSchema[constraint] === undefined) {
                        allConstraints.add(constraint);
                      }
                    });
                  });
                  
                  return Array.from(allConstraints).map(constraint => (
                    <option key={constraint} value={constraint}>{constraint}</option>
                  ));
                })()}
              </select>

              {/* Отображение текущих ограничений */}
              {(() => {
                const types = Array.isArray(propSchema.type) 
                  ? propSchema.type 
                  : [propSchema.type || 'string'];
                
                const constraints = [];
                types.forEach(type => {
                  Object.entries(SCHEMA_CONSTRAINTS[type] || {}).forEach(([constraint, def]) => {
                    if (propSchema[constraint] !== undefined && !constraints.some(c => c.name === constraint)) {
                      constraints.push({
                        name: constraint,
                        definition: def,
                        value: propSchema[constraint]
                      });
                    }
                  });
                });
                
                return constraints.map(({ name, definition, value }) => (
                  <div key={name} className="constraint-field">
                    <label>{name}</label>
                    {renderConstraintInput(name, definition, value, (newValue) => {
                      handleNestedChange(key, propName, {
                        ...propSchema,
                        [name]: newValue
                      });
                    })}
                    <SmallButton
                      icon={<FaTimes />}
                      onClick={() => {
                        const { [name]: _, ...rest } = propSchema;
                        handleNestedChange(key, propName, rest);
                      }}
                    />
                  </div>
                ));
              })()}

              {/* Вложенные properties и required */}
              {propSchema.type === 'object' && (
                <>
                  {propSchema.properties && (
                    <div className="form-field">
                      <label>Свойства</label>
                      <JsonFormEditor 
                        data={{ properties: propSchema.properties }}
                        onChange={(newData) => handleNestedChange(key, propName, {
                          ...propSchema,
                          properties: newData.properties
                        })}
                        isSchema={true}
                      />
                    </div>
                  )}
                  
                  {propSchema.required && (
                    <div className="form-field">
                      <label>Обязательные поля</label>
                      <JsonFormEditor 
                        data={{ required: propSchema.required }}
                        onChange={(newData) => handleNestedChange(key, propName, {
                          ...propSchema,
                          required: newData.required
                        })}
                        isSchema={true}
                      />
                    </div>
                  )}
                </>
              )}

              {/* Элементы массива */}
              {propSchema.type === 'array' && propSchema.items && (
                <div className="form-field">
                  <label>Элементы массива</label>
                  <JsonFormEditor 
                    data={{ items: propSchema.items }}
                    onChange={(newData) => handleNestedChange(key, propName, {
                      ...propSchema,
                      items: newData.items
                    })}
                    isSchema={true}
                  />
                </div>
              )}
            </div>
          )}
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
        // Для массивов примитивов (строк, чисел, булевых значений)
        if (value.every(item => typeof item !== 'object' || item === null)) {
          return (
            <div className="array-field">
              {value.map((item, index) => (
                <div key={index} className="array-item">
                  {/* Если есть enum в схеме, показываем select */}
                  {isSchema && schemaData?.items?.enum ? (
                    <select
                      value={item}
                      onChange={(e) => handleArrayChange(key, index, e.target.value)}
                    >
                      {schemaData.items.enum.map((option, i) => (
                        <option key={i} value={option}>{option}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={typeof item === 'number' ? 'number' : 'text'}
                      value={item}
                      onChange={(e) => {
                        let newValue = e.target.value;
                        if (typeof item === 'number') {
                          newValue = Number(newValue) || 0;
                        }
                        handleArrayChange(key, index, newValue);
                      }}
                    />
                  )}
                  <SmallButton 
                    icon={<FaTimes />}
                    onClick={() => handleRemoveArrayItem(key, index)}
                  />
                </div>
              ))}
              <SmallButton 
                icon={<FaPlus />}
                onClick={() => {
                  const newItem = value.length > 0 
                    ? (typeof value[0] === 'string' ? 
                        (schemaData?.items?.enum?.[0] || '') : 
                        typeof value[0] === 'number' ? 0 : 
                        typeof value[0] === 'boolean' ? false : '')
                    : '';
                  handleAddArrayItem(key, newItem);
                }}
              />
            </div>
          );
        }
        // Для массивов объектов
        return (
          <div className="array-field">
            {value.map((item, index) => (
              <div key={index} className="array-item">
                <JsonFormEditor 
                  data={item} 
                  onChange={(newValue) => handleArrayChange(key, index, newValue)}
                  isSchema={isSchema}
                />
                <SmallButton 
                  icon={<FaTimes />}
                  onClick={() => handleRemoveArrayItem(key, index)}
                />
              </div>
            ))}
            <SmallButton 
              icon={<FaPlus />}
              onClick={() => handleAddArrayItem(key, isSchema ? {} : {})}
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
         case 'string':
      // Проверяем наличие формата или enum (только в режиме схемы)
      if (isSchema && value?.format) {
        switch (value.format) {
          case 'date':
            return (
              <input
                type="date"
                value={value.default || ''}
                onChange={(e) => onChange({ ...value, default: e.target.value })}
              />
            );
          case 'date-time':
        // Конвертируем ISO строку в формат для datetime-local
            const dateTimeValue = value.default 
              ? value.default.replace(/:\d{2}\.\d{3}Z$/, '').replace('T', 'T')
              : '';
            return (
              <input
                type="datetime-local"
                value={dateTimeValue}
                onChange={(e) => {
                  // Конвертируем обратно в ISO формат
                  const isoValue = e.target.value ? `${e.target.value}:00Z` : '';
                  onChange({ ...value, default: isoValue });
                }}
                step="1"  // Позволяет указывать секунды
              />
            );
          case 'time':
            return (
              <input
                type="time"
                value={value.default || ''}
                onChange={(e) => onChange({ ...value, default: e.target.value })}
              />
            );
          case 'email':
            return (
              <input
                type="email"
                value={value.default || ''}
                onChange={(e) => onChange({ ...value, default: e.target.value })}
              />
            );
          case 'uri':
          case 'uri-reference':
            return (
              <input
                type="url"
                value={value.default || ''}
                onChange={(e) => onChange({ ...value, default: e.target.value })}
                placeholder="https://example.com"
              />
            );
          case 'hostname':
            return (
              <input
                type="text"
                value={value.default || ''}
                onChange={(e) => onChange({ ...value, default: e.target.value })}
                placeholder="example.com"
              />
            );
          case 'ipv4':
            return (
              <input
                type="text"
                value={value.default || ''}
                onChange={(e) => onChange({ ...value, default: e.target.value })}
                placeholder="192.168.0.1"
                pattern="^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$"
              />
            );
          case 'ipv6':
            return (
              <input
                type="text"
                value={value.default || ''}
                onChange={(e) => onChange({ ...value, default: e.target.value })}
                placeholder="2001:0db8:85a3::8a2e:0370:7334"
              />
            );
          case 'uuid':
            return (
              <input
                type="text"
                value={value.default || ''}
                onChange={(e) => onChange({ ...value, default: e.target.value })}
                placeholder="550e8400-e29b-41d4-a716-446655440000"
                pattern="^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"
              />
            );
          case 'regex':
            return (
              <input
                type="text"
                value={value.default || ''}
                onChange={(e) => onChange({ ...value, default: e.target.value })}
                placeholder="^[A-Za-z]+$"
              />
            );
          default:
            return (
              <input
                type="text"
                value={value.default || ''}
                onChange={(e) => onChange({ ...value, default: e.target.value })}
              />
            );
        }
      }

       if (key.toLowerCase().includes('date') && typeof value === 'string') {
        if (value.includes('T')) {
          // Дата-время
          return (
            <input
              type="datetime-local"
              value={formatDateTimeForInput(value)}
              onChange={(e) => {
                const newValue = parseDateTimeFromInput(e.target.value);
                handleChange(key, newValue);
              }}
              step="1"
            />
          );
        } else if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
          // Только дата
          return (
            <input
              type="date"
              value={value}
              onChange={(e) => handleChange(key, e.target.value)}
            />
          );
        }
      }

      if (isSchema && value?.enum) {
        return (
          <select
            value={value.default || ''}
            onChange={(e) => onChange({ ...value, default: e.target.value })}
          >
            {value.enum.map((option, i) => (
              <option key={i} value={option}>{option}</option>
            ))}
          </select>
        );
      }
      default:
        return (
          <input
            type="text"
            value={!isSchema ? value : value?.default || ''}
            onChange={(e) => {
              if (isSchema) {
                onChange({ ...value, default: e.target.value });
              } else {
                onChange(key, e.target.value);
              }
            }}
          />
        );
    }
  };

  if (!data || typeof data !== 'object') {
    return <div className="form-message">Некорректные {isSchema ? "схема" : "JSON"} данные</div>;
  }

   return (
    <div className={`json-form-editor ${isSchema ? 'schema-editor-form' : ''}`}>
      {/* Поля схемы показываем только если они есть или это новая схема */}
      {shouldShowSchemaField('$schema') && (
        <div className="form-field">
          <label>$schema</label>
          <input
            type="text"
            value={data.$schema || ''}
            onChange={(e) => handleChange('$schema', e.target.value)}
            placeholder="http://json-schema.org/draft-07/schema#"
          />
          {data.$schema && (
            <SmallButton
              icon={<FaTimes />}
              onClick={() => handleChange('$schema', undefined)}
            />
          )}
        </div>
      )}

      {shouldShowSchemaField('title') && (
        <div className="form-field">
          <label>title</label>
          <input
            type="text"
            value={data.title || ''}
            onChange={(e) => handleChange('title', e.target.value)}
          />
          {data.title && (
            <SmallButton
              icon={<FaTimes />}
              onClick={() => handleChange('title', undefined)}
            />
          )}
        </div>
      )}

      {shouldShowSchemaField('description') && (
        <div className="form-field">
          <label>description</label>
          <textarea
            value={data.description || ''}
            onChange={(e) => handleChange('description', e.target.value)}
          />
          {data.description && (
            <SmallButton
              icon={<FaTimes />}
              onClick={() => handleChange('description', undefined)}
            />
          )}
        </div>
      )}

      {/* Кнопка добавления полей схемы, если их нет
      {isSchema && !data.$schema && !data.title && !data.description && (
        <div className="form-field">
          <EditorButton
            icon={<FaPlus />}
            label="Добавить метаданные"
            onClick={() => handleChange('$schema', 'http://json-schema.org/draft-07/schema#')}
          />
        </div>
      )} */}

      {/* Остальные поля */}
      {Object.keys(data)
        .filter(key => !(isSchema && ['$schema', 'title', 'description'].includes(key)))
        .map((key) => (
          <div key={key} className="form-field">
            <label>{key}</label>
            {renderField(key, data[key])}
          </div>
        ))}
    </div>
  );
};

// Основной компонент JSON редактора
const JsonEditor = forwardRef((props, ref) => {
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

  const generateJsonFromSchema = () => {
  try {
    const schema = JSON.parse(schemaValue);
    const generatedJson = generateSampleFromSchema(schema);
    setJsonValue(JSON.stringify(generatedJson, null, 2));
    setActiveTab('json'); // Переключаемся на вкладку JSON
    showTempMessage("Документ сгенерирован по схеме!", "success");
  } catch (error) {
    showTempMessage(`Ошибка генерации: ${error.message}`, "error");
  }
};

// Вспомогательная функция для генерации данных по схеме
const generateSampleFromSchema = (schema) => {
    if (!schema || typeof schema !== 'object') return {};

    // Если есть пример
    if (schema.examples && schema.examples.length > 0) {
      return schema.examples[0];
    }

    // Если есть default
    if (schema.default !== undefined) {
      return schema.default;
    }

    // Обработка разных типов данных в схеме
    switch (schema.type) {
      case 'object':
        const obj = {};
        if (schema.properties) {
          for (const [key, propSchema] of Object.entries(schema.properties)) {
            obj[key] = generateSampleFromSchema(propSchema);
          }
        }
        return obj;

      case 'array':
        if (schema.items) {
          return [generateSampleFromSchema(schema.items)];
        } else if (schema.contains) {
          return [generateSampleFromSchema(schema.contains)];
        }
        return [];

      case 'string':
        if (schema.format) {
          switch (schema.format) {
            case 'date': return new Date().toISOString().split('T')[0];
            case 'date-time': return new Date().toISOString();
            case 'time': return new Date().toISOString().split('T')[1].split('.')[0];
            case 'email': return 'example@email.com';
            case 'hostname': return 'example.com';
            case 'ipv4': return '192.168.0.1';
            case 'ipv6': return '2001:0db8:85a3:0000:0000:8a2e:0370:7334';
            case 'uri': return 'https://example.com';
            case 'uuid': return '550e8400-e29b-41d4-a716-446655440000';
          }
        }
        if (schema.enum && schema.enum.length > 0) {
          return schema.enum[0];
        }
        return 'sample_string';

      case 'number':
        return schema.minimum !== undefined ? schema.minimum : 0;

      case 'integer':
        return schema.minimum !== undefined ? Math.floor(schema.minimum) : 0;

      case 'boolean':
        return true;

      case 'null':
        return null;

      default:
        return {};
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
                      onSort={handleSort}
                      onFilter={handleFilter}
                      sortConfig={sortConfig}
                      filterText={filterText}
                      filterKey={filterKey}
                      onFilterChange={handleFilterChange}
                    />
                  ) : (
                    <JsonFormEditor 
                      data={schemaData} 
                      onChange={handleSchemaChange}
                      isSchema={true}
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
                        label="Создать схему"
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
                    <>
                      <EditorButton 
                        icon={<FaFileAlt />}  // Иконка документа
                        label="Создать документ"
                        onClick={generateJsonFromSchema}
                      />
                      <EditorButton 
                        icon={<FaCheckCircle />}
                        label="Проверить JSON"
                        onClick={validateJsonAgainstSchema}
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