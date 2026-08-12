import { useState } from 'react';
import { FarmMapProvider, useFarmMap } from './context/FarmMapContext';
import { MapView } from './components/MapView';
import { LAYER_COLORS, LAYER_LABELS, LINK_TYPE_LABELS, LINK_TYPE_COLORS } from './types';
import type { Layer, Equipment } from './types';
import './App.css';

const BUILD_TIME = new Date().toLocaleTimeString();

export default function App() {
  return (
    <FarmMapProvider>
      <AppLayout />
    </FarmMapProvider>
  );
}

function CostSummary({
  equipment,
  editMode,
  dispatch,
}: {
  equipment: Equipment[];
  editMode: boolean;
  dispatch: ReturnType<typeof useFarmMap>['dispatch'];
}) {
  const [expanded, setExpanded] = useState(false);

  // Group by layer
  const layerOrder: Layer[] = ['verse', 'scl', 'future'];
  const grouped: Record<string, Equipment[]> = {};
  equipment.forEach((eq) => {
    if (!grouped[eq.layer]) grouped[eq.layer] = [];
    grouped[eq.layer].push(eq);
  });

  const calcCost = (eq: Equipment) => {
    if (eq.unitCost === undefined || eq.unitCost === null) return 'TBD';
    return `₦${(eq.quantity * eq.unitCost).toLocaleString()}`;
  };

  return (
    <div className={`cost-summary ${expanded ? 'cost-summary--expanded' : ''}`}>
      <div className="cost-summary__header" onClick={() => setExpanded(!expanded)}>
        <span className="cost-summary__title">💰 Cost Summary</span>
        <span className="cost-summary__chevron">▾</span>
      </div>
      {expanded && (
        <div className="cost-summary__body">
          {layerOrder.map((layer) => {
            const items = grouped[layer];
            if (!items || items.length === 0) return null;
            const totalKnown = items.reduce((sum, eq) => {
              if (eq.unitCost !== undefined && eq.unitCost !== null) {
                return sum + eq.quantity * eq.unitCost;
              }
              return sum;
            }, 0);
            const hasTbd = items.some((eq) => eq.unitCost === undefined || eq.unitCost === null);

            return (
              <div key={layer} className="cost-group">
                <div
                  className="cost-group__title"
                  style={{ color: LAYER_COLORS[layer] }}
                >
                  {LAYER_LABELS[layer]}
                  {totalKnown > 0 && (
                    <span className="cost-group__total">
                      ₦{totalKnown.toLocaleString()}
                    </span>
                  )}
                </div>
                {items.map((eq) => (
                  <div key={eq.id} className="cost-item">
                    <span className="cost-item__info">
                      {eq.quantity}× {eq.manufacturer} {eq.model}
                    </span>
                    <span className="cost-item__location">{eq.locationId}</span>
                    <span className="cost-item__cost">
                      {editMode ? (
                        <input
                          className="cost-item__input"
                          type="text"
                          placeholder="TBD"
                          defaultValue={eq.unitCost ?? ''}
                          onChange={(e) => {
                            const v = e.target.value === '' ? undefined : Number(e.target.value);
                            dispatch({
                              type: 'UPDATE_EQUIPMENT',
                              payload: { ...eq, unitCost: v && !isNaN(v) ? v : undefined },
                            });
                          }}
                        />
                      ) : (
                        calcCost(eq)
                      )}
                    </span>
                  </div>
                ))}
                {hasTbd && totalKnown > 0 && (
                  <div className="cost-group__note">+ TBD items not included in total</div>
                )}
              </div>
            );
          })}
          {layerOrder.every((l) => !grouped[l]) && (
            <p className="cost-summary__empty">No cost data available.</p>
          )}
        </div>
      )}
    </div>
  );
}

function AppLayout() {
  const { data, dispatch } = useFarmMap();
  const { locations, equipment, layerVisibility, linkTypeVisibility, selectedLocationId, editMode } = data;

  const selectedLocation = selectedLocationId
    ? locations.find((l) => l.id === selectedLocationId) || null
    : null;

  const selectedEquipment = selectedLocationId
    ? equipment.filter((eq) => eq.locationId === selectedLocationId)
    : [];

  const selectedParent = selectedLocation?.parentId
    ? locations.find((l) => l.id === selectedLocation.parentId) || null
    : null;

  return (
    <div className="app">
      {/* ---- Header ---- */}
      <header className="app-header">
        <div className="app-brand">
          <div className="app-brand-icon">🌾</div>
          <div>
            <h1 className="app-title">SCL Farms — Network Remediation &amp; Enhancement</h1>
            <p className="app-subtitle">Kwali, Abuja · Existing Infrastructure | Verse IT Remediation | SCL Enhancement</p>
          </div>
        </div>

        <div className="app-header-actions">
          <label className="edit-toggle">
            <input
              type="checkbox"
              checked={editMode}
              onChange={(e) => dispatch({ type: 'SET_EDIT_MODE', payload: e.target.checked })}
            />
            <span>{editMode ? '✎ EDIT MODE ON' : '✎ Edit Mode'}</span>
          </label>
        </div>
      </header>

      {/* ---- Body ---- */}
      <div className="app-body">
        {/* Main map area */}
        <div className="app-map-area">
          <MapView />
        </div>

        {/* ---- Legend sidebar ---- */}
        <aside className="app-legend">
          <h3 className="legend-title">Legend</h3>
          {(Object.keys(LAYER_COLORS) as Layer[]).map((layer) => (
            <label
              key={layer}
              className={`legend-item ${!layerVisibility[layer] ? 'legend-item--off' : ''}`}
            >
              <input
                type="checkbox"
                checked={layerVisibility[layer]}
                onChange={() => dispatch({ type: 'TOGGLE_LAYER', payload: layer })}
              />
              <span
                className="legend-swatch"
                style={{ background: LAYER_COLORS[layer] }}
              />
              <span className="legend-label">{LAYER_LABELS[layer]}</span>
            </label>
          ))}

          {/* Link type toggles */}
          <h3 className="legend-title" style={{ marginTop: 16 }}>Links</h3>
          {(Object.keys(LINK_TYPE_LABELS) as Array<'fibre' | 'ethernet' | 'wireless'>).map((lt) => (
            <label
              key={lt}
              className={`legend-item ${!linkTypeVisibility[lt] ? 'legend-item--off' : ''}`}
            >
              <input
                type="checkbox"
                checked={linkTypeVisibility[lt]}
                onChange={() => dispatch({ type: 'TOGGLE_LINK_TYPE', payload: lt })}
              />
              <span
                className="legend-swatch"
                style={{ background: LINK_TYPE_COLORS[lt] }}
              />
              <span className="legend-label">{LINK_TYPE_LABELS[lt]}</span>
            </label>
          ))}

          {/* ---- Location detail (when selected) ---- */}
          {selectedLocation && (
            <div className="location-detail">
              <h4 className="location-detail__name">
                {selectedLocation.name}
              </h4>
              {selectedParent && (
                <p className="location-detail__parent">
                  ↳ inside <strong>{selectedParent.name}</strong>
                </p>
              )}
              {selectedLocation.description && (
                <p className="location-detail__desc">{selectedLocation.description}</p>
              )}
              <p className="location-detail__coords">
                Position: ({selectedLocation.x}, {selectedLocation.y})
              </p>

              {/* Equipment grouped by layer */}
              {selectedEquipment.length > 0 && (() => {
                const layerOrder: Layer[] = ['existing', 'verse', 'scl', 'remove', 'future'];
                const grouped: Record<string, typeof selectedEquipment> = {};
                selectedEquipment.forEach((eq) => {
                  if (!grouped[eq.layer]) grouped[eq.layer] = [];
                  grouped[eq.layer].push(eq);
                });

                return layerOrder.map((layer) => {
                  const items = grouped[layer];
                  if (!items || items.length === 0) return null;
                  return (
                    <div key={layer} className="equipment-group">
                      <h5
                        className="equipment-group__header"
                        style={{ borderLeftColor: LAYER_COLORS[layer] }}
                      >
                        {LAYER_LABELS[layer]}
                      </h5>
                      {items.map((eq) => (
                        <div
                          key={eq.id}
                          className="equipment-row"
                          style={{ borderLeftColor: LAYER_COLORS[eq.layer] }}
                        >
                          <div className="equipment-row__header">
                            {editMode ? (
                              <input
                                className="eq-qty-input"
                                type="number"
                                min="0"
                                defaultValue={eq.quantity}
                                onChange={(e) => {
                                  const v = Math.max(0, Number(e.target.value) || 0);
                                  dispatch({ type: 'UPDATE_EQUIPMENT', payload: { ...eq, quantity: v } });
                                }}
                              />
                            ) : (
                              <span className="equipment-row__qty">{eq.quantity}×</span>
                            )}
                            <span className="equipment-row__model">
                              {eq.manufacturer ? `${eq.manufacturer} ` : ''}{eq.model}
                            </span>
                            {editMode && (
                              <button
                                className="eq-delete-btn"
                                onClick={() => dispatch({ type: 'REMOVE_EQUIPMENT', payload: eq.id })}
                                title="Remove equipment"
                              >
                                ×
                              </button>
                            )}
                          </div>
                          <div className="equipment-row__meta">
                            {eq.category} · {eq.status}
                          </div>
                          {eq.notes && (
                            <div className="equipment-row__notes">{eq.notes}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                });
              })()}
              {selectedEquipment.length === 0 && (
                <p className="location-detail__empty">No equipment at this location.</p>
              )}

              {/* ---- Edit mode controls ---- */}
              {editMode && (
                <div className="edit-controls">
                  {/* Add equipment to selected location */}
                  <button
                    className="edit-controls__btn"
                    onClick={() => {
                      const name = prompt('Equipment name (e.g. "Ubiquiti UniFi U6 Pro"):');
                      if (!name) return;
                      const layer = prompt('Layer (existing/verse/scl/remove/future):', 'scl') as Layer;
                      const qty = Number(prompt('Quantity:', '1')) || 1;
                      const id = 'eq-' + Date.now().toString(36);
                      dispatch({
                        type: 'ADD_EQUIPMENT',
                        payload: {
                          id,
                          locationId: selectedLocation.id,
                          layer,
                          category: 'Access Point',
                          manufacturer: '',
                          model: name,
                          quantity: qty,
                          status: 'Manual entry',
                          notes: '',
                        },
                      });
                    }}
                  >
                    ＋ Add Equipment
                  </button>

                  {/* Add sub-location (only for top-level locations) */}
                  {!selectedLocation.parentId && (
                    <button
                      className="edit-controls__btn"
                      onClick={() => {
                        const name = prompt('Sub-location name:');
                        if (!name) return;
                        const id = 'sub-' + Date.now().toString(36);
                        dispatch({
                          type: 'ADD_LOCATION',
                          payload: {
                            id,
                            name,
                            x: selectedLocation.x + 40,
                            y: selectedLocation.y + 50,
                            parentId: selectedLocation.id,
                            description: '',
                          },
                        });
                      }}
                    >
                      ＋ Add Sub-location
                    </button>
                  )}

                  {/* Delete selected location */}
                  <button
                    className="edit-controls__btn edit-controls__btn--danger"
                    onClick={() => {
                      if (confirm(`Delete "${selectedLocation.name}" and all its equipment/links?`)) {
                        dispatch({ type: 'REMOVE_LOCATION', payload: selectedLocation.id });
                      }
                    }}
                  >
                    ✕ Delete Location
                  </button>
                </div>
              )}

              <button
                className="location-detail__deselect"
                onClick={() => dispatch({ type: 'SELECT_LOCATION', payload: null })}
              >
                Deselect
              </button>
            </div>
          )}
          {/* ---- Cost Summary ---- */}
          <CostSummary equipment={equipment} editMode={editMode} dispatch={dispatch} />
        </aside>
      </div>

      {/* ---- Summary bar ---- */}
      <footer className="app-footer">
        <span>{locations.length} Locations</span>
        <span>·</span>
        <span>Scroll to zoom · Drag to pan</span>
        <span>·</span>
        <span>{editMode ? 'Edit Mode: drag nodes to reposition' : 'Click a location for details'}</span>
        <span>·</span>
        <span>v5 · {BUILD_TIME}</span>
      </footer>
    </div>
  );
}
