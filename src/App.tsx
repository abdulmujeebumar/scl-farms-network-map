import { useState, useCallback, useRef } from 'react';
import { FarmMapProvider, useFarmMap } from './context/FarmMapContext';
import { MapView } from './components/MapView';
import { LAYER_COLORS, LAYER_LABELS, LINK_TYPE_LABELS, LINK_TYPE_COLORS } from './types';
import type { Layer, Equipment } from './types';
import './App.css';

const BUILD_TIME = new Date().toLocaleTimeString();

/** SCL Farms logo */
function SCLLogo() {
  return (
    <img src="/scl_logo.png" alt="SCL Farms" width="32" height="32" style={{ flexShrink: 0, borderRadius: 4 }} />
  );
}

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
  onExportCSV,
}: {
  equipment: Equipment[];
  editMode: boolean;
  dispatch: ReturnType<typeof useFarmMap>['dispatch'];
  onExportCSV: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  // Group by layer
  const layerOrder: Layer[] = ['scl'];
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
                          type="number"
                          min="0"
                          placeholder="TBD"
                          value={eq.unitCost ?? ''}
                          onChange={(e) => {
                            const v = e.target.value === '' ? undefined : Math.max(0, Number(e.target.value));
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
          <div className="cost-summary__actions">
            <button className="cost-summary__btn" onClick={onExportCSV}>📊 Export CSV</button>
            <button className="cost-summary__btn" onClick={() => window.print()}>📄 Export PDF</button>
          </div>
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

  // ---- Export handlers ----
  const handleExportPNG = useCallback(() => {
    const svg = document.querySelector('.nc-svg') as SVGSVGElement;
    if (!svg) return;
    const clone = svg.cloneNode(true) as SVGSVGElement;
    const rect = svg.getBoundingClientRect();
    clone.setAttribute('width', String(rect.width));
    clone.setAttribute('height', String(rect.height));
    const data = new XMLSerializer().serializeToString(clone);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = rect.width * 2;
      canvas.height = rect.height * 2;
      const ctx = canvas.getContext('2d')!;
      ctx.scale(2, 2);
      ctx.fillStyle = '#F8F9FA';
      ctx.fillRect(0, 0, rect.width, rect.height);
      ctx.drawImage(img, 0, 0);
      const a = document.createElement('a');
      a.download = 'scl-farms-network-map.png';
      a.href = canvas.toDataURL('image/png');
      a.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(data)));
  }, []);

  const handleExportPDF = useCallback(() => {
    window.print();
  }, []);

  const handleExportCSV = useCallback(() => {
    const sclItems = equipment.filter((e) => e.layer === 'scl');
    const header = 'Layer,Location,Manufacturer,Model,Quantity,Unit Cost (₦),Total (₦),Status';
    const rows = sclItems.map((eq) => {
      const total = eq.unitCost ? eq.quantity * eq.unitCost : 'TBD';
      return `"${LAYER_LABELS[eq.layer]}","${eq.locationId}","${eq.manufacturer || ''}","${eq.model || ''}",${eq.quantity},${eq.unitCost ?? 'TBD'},${total},"${eq.status || ''}"`;
    });
    const csv = [header, ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.download = 'scl-farms-costing.csv';
    a.href = URL.createObjectURL(blob);
    a.click();
    URL.revokeObjectURL(a.href);
  }, [equipment]);

  // Sidebar resize
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const resizing = useRef(false);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    resizing.current = true;
    const startX = e.clientX;
    const startW = sidebarWidth;
    const onMove = (ev: MouseEvent) => {
      if (!resizing.current) return;
      const delta = startX - ev.clientX;
      setSidebarWidth(Math.max(200, Math.min(500, startW + delta)));
    };
    const onUp = () => { resizing.current = false; document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [sidebarWidth]);

  return (
    <div className="app">
      {/* ---- Header ---- */}
      <header className="app-header">
        <div className="app-brand">
          <SCLLogo />
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

        {/* Resize handle */}
        <div className="app-resize-handle" onMouseDown={handleResizeStart} />

        {/* ---- Legend sidebar ---- */}
        <aside className="app-legend" style={{ width: sidebarWidth, minWidth: sidebarWidth }}>
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
          <CostSummary equipment={equipment} editMode={editMode} dispatch={dispatch} onExportCSV={handleExportCSV} />
        </aside>
      </div>

      {/* ---- Summary bar ---- */}
      <footer className="app-footer">
        <span>{locations.length} Locations</span>
        <span>·</span>
        <span>Scroll to zoom · Drag to pan</span>
        <span>·</span>
        <span>{editMode ? 'Edit Mode: drag nodes to reposition' : 'Click a location for details'}</span>
        <span className="app-footer__spacer" />
        <button className="app-footer__btn" onClick={handleExportPNG} title="Export as PNG image">
          📷 Image
        </button>
        <button className="app-footer__btn" onClick={handleExportPDF} title="Export as PDF">
          📄 PDF
        </button>
        <span className="app-footer__brand">
          Powered by <strong>Koboweb Greentech Group</strong> · © KGTG 2026
        </span>
      </footer>
    </div>
  );
}
