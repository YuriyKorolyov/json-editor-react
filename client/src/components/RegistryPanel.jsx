// RegistryPanel.jsx
import React from 'react';

const RegistryPanel = ({
  registry,
  activePairId,
  onLoad,
  onDelete,
  onRename,
  isAuthenticated,
  editingPairId,
  editingPairName,
  setEditingPairId,
  setEditingPairName,
  activeTitle,
}) => {
  return (
    <div className="registry-panel">
      <div className="registry-header">
        <h3>Сохраненные документы</h3>
      </div>
      <div className="registry-list">
        {registry.length === 0 ? (
          <div className="registry-empty">Нет сохранений</div>
        ) : (
          registry.map((item) => (
            <div
              key={item.id}
              className={`registry-item ${activePairId === item.id ? "active" : ""}`}
              onClick={() => onLoad(item.id)}
            >
              <div className="registry-item-name-edit">
                {editingPairId === item.id ? (
                  <>
                    <input
                      value={editingPairName}
                      onChange={(e) => setEditingPairName(e.target.value)}
                    />
                    <div className="registry-item-edit-buttons">
                      <button
                        className="small-button"
                        onClick={() => onRename(item.id)}
                      >
                        ✔
                      </button>
                      <button
                        className="small-button"
                        onClick={() => setEditingPairId(null)}
                      >
                        ✖
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="registry-item-name">{item.name}</span>
                    <div className="registry-item-actions">
                      <button
                        className="small-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingPairId(item.id);
                          setEditingPairName(item.name);
                        }}
                      >
                        ✎
                      </button>
                      <button
                        className="small-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(item.id);
                        }}
                      >
                        🗑
                      </button>
                    </div>
                  </>
                )}
              </div>
              <div className="registry-item-meta">{new Date(item.createdAt).toLocaleString()}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default RegistryPanel;
