import { useRef, useState, useCallback, useEffect } from 'react';
import { useFarmMap } from '../context/FarmMapContext';
import { LAYER_COLORS, LAYER_LABELS, LINK_TYPE_COLORS, LINK_TYPE_LABELS, getLocationColor } from '../types';
import type { Location, Layer, Link } from '../types';
import './NetworkCanvas.css';

// ============================================================
// Grid constants
// ============================================================

const GRID_W = 1000;
const GRID_H = 700;

// ============================================================
// NetworkCanvas — main SVG schematic grid
// ============================================================

export function NetworkCanvas() {
  const { data, dispatch } = useFarmMap();
  const { locations, links, equipment, layerVisibility, linkTypeVisibility, selectedLocationId, editMode } = data;

  // Build location lookup for link rendering
  const locationMap = new Map(locations.map((l) => [l.id, l]));

  // Pan/zoom state
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: GRID_W, h: GRID_H });
  const [panning, setPanning] = useState(false);
  const panStart = useRef({ mx: 0, my: 0, vbx: 0, vby: 0 });
  const svgRef = useRef<SVGSVGElement>(null);

  // Drag-node state (edit mode only)
  const [dragNodeId, setDragNodeId] = useState<string | null>(null);
  const dragOffset = useRef({ dx: 0, dy: 0 });

  // Link-drawing state (Visio-style connector)
  const [linkMode, setLinkMode] = useState(false);
  const [linkingFrom, setLinkingFrom] = useState<string | null>(null);
  const [linkCursor, setLinkCursor] = useState({ gx: 0, gy: 0 });

  // Link-properties modal state
  const [pendingLink, setPendingLink] = useState<{ id?: string; from: string; to: string } | null>(null);
  const [draftType, setDraftType] = useState<'fibre' | 'ethernet' | 'wireless'>('fibre');
  const [draftLayer, setDraftLayer] = useState<Layer>('verse');

  // ---- Helpers ----
  const svgToGrid = useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRef.current;
      if (!svg) return { gx: 0, gy: 0 };
      const rect = svg.getBoundingClientRect();
      const gx = viewBox.x + ((clientX - rect.left) / rect.width) * viewBox.w;
      const gy = viewBox.y + ((clientY - rect.top) / rect.height) * viewBox.h;
      return { gx, gy };
    },
    [viewBox],
  );

  // ---- Zoom ----
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const scale = e.deltaY > 0 ? 1.06 : 1 / 1.06;
      const { gx: mx, gy: my } = svgToGrid(e.clientX, e.clientY);
      setViewBox((prev) => {
        const nw = prev.w * scale;
        const nh = prev.h * scale;
        return {
          x: prev.x + mx * (1 - scale),
          y: prev.y + my * (1 - scale),
          w: Math.max(100, Math.min(GRID_W * 5, nw)),
          h: Math.max(70, Math.min(GRID_H * 5, nh)),
        };
      });
    },
    [svgToGrid],
  );

  // ---- Pan ----
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      const target = e.target as Element;
      const isNode = !!target.closest('.nc-node');
      // Cancel linking only when clicking the background (not a node)
      if (linkMode) {
        if (!isNode) {
          setLinkMode(false);
          setLinkingFrom(null);
        }
        return;
      }
      // Only pan if not dragging a node
      if (isNode) return;
      setPanning(true);
      panStart.current = {
        mx: e.clientX,
        my: e.clientY,
        vbx: viewBox.x,
        vby: viewBox.y,
      };
    },
    [viewBox, linkMode],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      // Update link cursor position when in linking mode
      if (linkMode && linkingFrom) {
        const { gx, gy } = svgToGrid(e.clientX, e.clientY);
        setLinkCursor({ gx, gy });
      }

      // Node dragging
      if (dragNodeId) {
        const { gx, gy } = svgToGrid(e.clientX, e.clientY);
        const loc = locations.find((l) => l.id === dragNodeId);
        if (loc) {
          dispatch({
            type: 'UPDATE_LOCATION',
            payload: {
              ...loc,
              x: Math.round(gx - dragOffset.current.dx),
              y: Math.round(gy - dragOffset.current.dy),
            },
          });
        }
        return;
      }

      // Panning
      if (!panning) return;
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const dx = ((e.clientX - panStart.current.mx) / rect.width) * viewBox.w * 0.6;
      const dy = ((e.clientY - panStart.current.my) / rect.height) * viewBox.h * 0.6;
      setViewBox((prev) => ({
        ...prev,
        x: panStart.current.vbx - dx,
        y: panStart.current.vby - dy,
      }));
    },
    [dragNodeId, panning, linkMode, linkingFrom, viewBox, svgToGrid, locations, dispatch],
  );

  const handleMouseUp = useCallback(() => {
    setPanning(false);
    setDragNodeId(null);
  }, []);

  // ---- Node drag start ----
  const handleNodeMouseDown = useCallback(
    (e: React.MouseEvent, loc: Location) => {
      if (!editMode || linkMode) return;
      // Don't stopPropagation — it blocks onClick in some browsers
      const { gx, gy } = svgToGrid(e.clientX, e.clientY);
      setDragNodeId(loc.id);
      dragOffset.current = { dx: gx - loc.x, dy: gy - loc.y };
    },
    [editMode, linkMode, svgToGrid],
  );

  // ---- Node click ----
  const handleNodeClick = useCallback(
    (loc: Location) => {
      // Visio-style linking
      if (linkMode) {
        if (!linkingFrom) {
          // First click: set source
          setLinkingFrom(loc.id);
        } else if (linkingFrom !== loc.id) {
          // Second click: open link-properties dialog
          const fromLoc = locations.find((l) => l.id === linkingFrom);
          const isParentChild =
            (fromLoc?.parentId === loc.id) || (loc.parentId === fromLoc?.id);
          setPendingLink({ from: linkingFrom, to: loc.id });
          setDraftType(isParentChild ? 'ethernet' : 'fibre');
          setDraftLayer(isParentChild ? 'scl' : 'verse');
          setLinkMode(false);
          setLinkingFrom(null);
        }
        return;
      }
      // Toggle: clicking the selected location again collapses it
      if (selectedLocationId === loc.id) {
        dispatch({ type: 'SELECT_LOCATION', payload: null });
        return;
      }
      dispatch({ type: 'SELECT_LOCATION', payload: loc.id });
    },
    [dispatch, linkMode, linkingFrom, selectedLocationId, locations],
  );

  const enterLinkMode = useCallback(() => {
    setLinkMode(true);
    setLinkingFrom(null);
  }, []);

  const cancelLinking = useCallback(() => {
    setLinkMode(false);
    setLinkingFrom(null);
  }, []);

  const openEditLink = useCallback((link: Link) => {
    setPendingLink({ id: link.id, from: link.from, to: link.to });
    setDraftType(link.type);
    setDraftLayer(link.layer);
  }, []);

  const confirmLink = useCallback(() => {
    if (!pendingLink) return;
    const label = draftType === 'fibre' ? 'Fibre' : draftType === 'ethernet' ? 'Ethernet' : 'Wireless';
    if (pendingLink.id) {
      const existing = links.find((l) => l.id === pendingLink.id);
      dispatch({
        type: 'UPDATE_LINK',
        payload: {
          id: pendingLink.id,
          from: pendingLink.from,
          to: pendingLink.to,
          layer: draftLayer,
          type: draftType,
          label,
          notes: existing?.notes,
        },
      });
    } else {
      const id = 'link-' + Date.now().toString(36);
      dispatch({
        type: 'ADD_LINK',
        payload: {
          id,
          from: pendingLink.from,
          to: pendingLink.to,
          layer: draftLayer,
          type: draftType,
          label,
        },
      });
    }
    setPendingLink(null);
  }, [pendingLink, draftLayer, draftType, links, dispatch]);

  // Escape key to cancel linking
  useEffect(() => {
    if (!linkMode) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLinkMode(false);
        setLinkingFrom(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [linkMode]);

  const resetView = useCallback(() => {
    setViewBox({ x: 0, y: 0, w: GRID_W, h: GRID_H });
  }, []);

  // Top-level locations always visible; sub-locations filtered by parent selection
  const topLevelLocs = locations.filter((l) => !l.parentId);
  // Active parent: if a sub-location is selected, use its parent; otherwise use selectedLocationId
  const selectedLoc = locations.find((l) => l.id === selectedLocationId);
  const activeParentId = selectedLoc?.parentId || selectedLocationId;
  // Sub-locations: visible when parent is active, or always while linking
  const subLocs = locations.filter(
    (l) => l.parentId && (linkMode || l.parentId === activeParentId)
  );

  return (
    <div className="network-canvas" onContextMenu={(e) => e.preventDefault()}>
      {/* Toolbar */}
      <div className="nc-toolbar">
        <button className="nc-btn" onClick={resetView}>
          ↺ Reset View
        </button>
        <span className="nc-hint">Scroll to zoom · Drag to pan</span>
        {editMode && (
          <>
            <button
              className="nc-btn"
              onClick={() => {
                const name = window.prompt('Location name:');
                if (!name?.trim()) return;
                const layers: Layer[] = ['existing', 'verse', 'scl', 'remove', 'future'];
                const labels = ['Existing/Current', 'Verse IT', 'SCL Enhancement', 'Remove/Replace', 'Future/Optional'];
                const choice = window.prompt(
                  'Layer:\n1 = Existing/Current\n2 = Verse IT Remediation\n3 = SCL Enhancement\n4 = Remove/Replace\n5 = Future/Optional',
                  '1'
                );
                const idx = choice ? parseInt(choice) - 1 : 0;
                const layer = layers[idx] || 'existing';
                const id = 'loc-' + Date.now().toString(36);
                const cx = viewBox.x + viewBox.w / 2;
                const cy = viewBox.y + viewBox.h / 2;
                dispatch({
                  type: 'ADD_LOCATION',
                  payload: {
                    id,
                    name: name.trim(),
                    x: Math.round(cx),
                    y: Math.round(cy),
                    description: `New ${labels[idx]} location.`,
                  },
                });
              }}
            >
              ＋ Add Location
            </button>
            <button
              className={`nc-btn nc-btn--link ${linkMode ? 'nc-btn--active' : ''}`}
              onClick={() => {
                if (linkMode) {
                  cancelLinking();
                } else {
                  enterLinkMode();
                }
              }}
            >
              {linkMode ? '⏹ Cancel Link' : '🔗 Add Link'}
            </button>
            {linkMode && (
              <span className="nc-hint nc-hint--link">
                {linkingFrom ? 'Click target location...' : 'Click source location...'} (Esc to cancel)
              </span>
            )}
          </>
        )}
      </div>

      <svg
        ref={svgRef}
        className="nc-svg"
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: linkMode ? 'crosshair' : panning ? 'grabbing' : dragNodeId ? 'grabbing' : 'grab' }}
      >
        <defs>
          {/* Grid patterns */}
          <pattern id="nc-grid-sm" width="50" height="50" patternUnits="userSpaceOnUse">
            <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#DEE2E6" strokeWidth="0.5" opacity="0.6" />
          </pattern>
          <pattern id="nc-grid-lg" width="250" height="250" patternUnits="userSpaceOnUse">
            <rect width="250" height="250" fill="url(#nc-grid-sm)" />
            <path d="M 250 0 L 0 0 0 250" fill="none" stroke="#CED4DA" strokeWidth="1" opacity="0.7" />
          </pattern>

          {/* Drop shadow */}
          <filter id="nc-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1" stdDeviation="3" floodColor="#000" floodOpacity="0.10" />
          </filter>
          <filter id="nc-shadow-sel" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="2" stdDeviation="6" floodColor="#3B82F6" floodOpacity="0.30" />
          </filter>
        </defs>

        {/* Background */}
        <rect x={-GRID_W} y={-GRID_H} width={GRID_W * 3} height={GRID_H * 3} fill="#F8F9FA" />
        <rect
          x={-GRID_W}
          y={-GRID_H}
          width={GRID_W * 3}
          height={GRID_H * 3}
          fill="url(#nc-grid-lg)"
        />

        {/* ---- Pulsing animation style ---- */}
        <style>{`
          @keyframes fibre-pulse {
            0% { stroke-dashoffset: 0; }
            100% { stroke-dashoffset: -30; }
          }
          @keyframes fibre-pulse-rev {
            0% { stroke-dashoffset: 0; }
            100% { stroke-dashoffset: 30; }
          }
          @keyframes wireless-signal {
            0% { stroke-dashoffset: 0; opacity: 0.9; }
            50% { opacity: 0.35; }
            100% { stroke-dashoffset: -24; opacity: 0.9; }
          }
          @keyframes wireless-signal-rev {
            0% { stroke-dashoffset: 0; opacity: 0.9; }
            50% { opacity: 0.35; }
            100% { stroke-dashoffset: 24; opacity: 0.9; }
          }
        `}</style>

        {/* ---- Network Links ---- */}
        {links.map((link, i) => {
          const from = locationMap.get(link.from);
          const to = locationMap.get(link.to);
          if (!from || !to) return null;

          const fromLoc = locationMap.get(link.from);
          const toLoc = locationMap.get(link.to);

          if (!layerVisibility[link.layer]) return null;
          // Link type filter only applies to non-existing links; existing links controlled by layer toggle alone
          if (link.layer !== 'existing' && !linkTypeVisibility[link.type]) return null;

          // Hide links to/from sub-locations unless parent is active (or while linking)
          if (!linkMode) {
            if (fromLoc?.parentId && fromLoc.parentId !== activeParentId) return null;
            if (toLoc?.parentId && toLoc.parentId !== activeParentId) return null;
          }

          const linkColor = LAYER_COLORS[link.layer];
          const midX = (from.x + to.x) / 2;
          const midY = (from.y + to.y) / 2;

          const isWireless = link.type === 'wireless';
          const isEthernet = link.type === 'ethernet';

          return (
            <g key={link.id} className={editMode ? 'nc-link--editable' : ''}>
              {/* Glow layer */}
              <line
                x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                stroke={linkColor}
                strokeWidth={isEthernet ? 3 : isWireless ? 6 : 8}
                strokeLinecap="round"
                opacity={isEthernet ? 0.15 : 0.10}
              />
              {/* Main line */}
              <line
                x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                stroke={linkColor}
                strokeWidth={isEthernet ? 2 : isWireless ? 2.5 : 3.5}
                strokeLinecap="round"
                strokeDasharray={isEthernet ? 'none' : isWireless ? '6 6' : '10 5'}
                opacity={isEthernet ? 0.7 : 0.85}
                style={isEthernet ? undefined : {
                  animation: isWireless
                    ? (i % 2 === 0 ? 'wireless-signal 1.6s linear infinite' : 'wireless-signal-rev 1.6s linear infinite')
                    : (i % 2 === 0 ? 'fibre-pulse 1.2s linear infinite' : 'fibre-pulse-rev 1.2s linear infinite'),
                }}
              />
              {/* Label */}
              <rect
                x={midX - 22} y={midY - 12}
                width="44" height="16"
                rx="3"
                fill="white"
                stroke={linkColor}
                strokeWidth="1"
                opacity="0.9"
              />
              <text
                x={midX} y={midY + 1}
                textAnchor="middle"
                fill={linkColor}
                fontSize="9"
                fontWeight="700"
                fontFamily="var(--font-family)"
                style={{ pointerEvents: 'none' }}
              >
                {isEthernet ? 'ETHERNET' : isWireless ? 'WIRELESS' : 'FIBRE'}
              </text>
              {/* Edit button in edit mode */}
              {editMode && (
                <g
                  style={{ cursor: 'pointer' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    openEditLink(link);
                  }}
                >
                  <circle cx={midX + 38} cy={midY - 12} r="8" fill="#3B82F6" opacity="0.9" />
                  <text x={midX + 38} y={midY - 9} textAnchor="middle" fill="white" fontSize="10" fontWeight="700">✎</text>
                </g>
              )}
              {/* Delete button in edit mode */}
              {editMode && (
                <g
                  style={{ cursor: 'pointer' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    dispatch({ type: 'REMOVE_LINK', payload: link.id });
                  }}
                >
                  <circle cx={midX + 20} cy={midY - 12} r="8" fill="#F97316" opacity="0.9" />
                  <text x={midX + 20} y={midY - 9} textAnchor="middle" fill="white" fontSize="11" fontWeight="700">×</text>
                </g>
              )}
            </g>
          );
        })}

        {/* ---- Temporary connector line (while linking) ---- */}
        {linkMode && linkingFrom && (() => {
          const src = locationMap.get(linkingFrom);
          if (!src) return null;
          return (
            <g>
              <line
                x1={src.x} y1={src.y}
                x2={linkCursor.gx} y2={linkCursor.gy}
                stroke="#3B82F6"
                strokeWidth="2.5"
                strokeDasharray="8 6"
                opacity="0.6"
              />
              <circle cx={linkCursor.gx} cy={linkCursor.gy} r="5" fill="#3B82F6" opacity="0.7" />
            </g>
          );
        })()}

        {/* ---- Location Nodes — Top-level ---- */}
        {topLevelLocs.map((loc) => {
          const isSelected = selectedLocationId === loc.id;
          const color = getLocationColor(loc.id);

          return (
            <g
              key={loc.id}
              className={`nc-node ${editMode ? 'nc-node--editable' : ''}`}
              onClick={() => handleNodeClick(loc)}
              onMouseDown={(e) => handleNodeMouseDown(e, loc)}
              filter={isSelected ? 'url(#nc-shadow-sel)' : 'url(#nc-shadow)'}
            >
              {/* Node pill */}
              <rect
                x={loc.x - 60}
                y={loc.y - 20}
                width={120}
                height={40}
                rx="8"
                fill="white"
                stroke={isSelected ? color : '#DEE2E6'}
                strokeWidth={isSelected ? 2.5 : 1}
              />

              {/* Layer color indicator dot */}
              <circle
                cx={loc.x - 45}
                cy={loc.y}
                r="7"
                fill={color}
                stroke="white"
                strokeWidth="2"
              />

              {/* Label */}
              <text
                x={loc.x - 30}
                y={loc.y + 4}
                fill="#212529"
                fontSize="12"
                fontWeight="600"
                fontFamily="var(--font-family)"
                style={{ pointerEvents: 'none' }}
              >
                {loc.name}
              </text>

              {/* ---- Equipment indicator dots ---- */}
              {(() => {
                const locEquipment = equipment.filter((eq) => eq.locationId === loc.id);
                if (locEquipment.length === 0) return null;
                const layersPresent = [...new Set(locEquipment.map((eq) => eq.layer))];
                return layersPresent.map((layer, i) => {
                  if (!layerVisibility[layer]) return null;
                  const eqColor = LAYER_COLORS[layer];
                  const cx = loc.x + 38 + i * 14;
                  const cy = loc.y - 4;
                  return (
                    <g key={`eq-dot-${layer}`}>
                      <circle cx={cx} cy={cy} r="5" fill={eqColor} stroke="white" strokeWidth="1.5" />
                      {i === layersPresent.length - 1 && (
                        <text x={cx + 7} y={cy + 3} fill="#868E96" fontSize="9" fontWeight="600" style={{ pointerEvents: 'none' }}>
                          {locEquipment.length}
                        </text>
                      )}
                    </g>
                  );
                });
              })()}

              {/* Drag handle */}
              {editMode && (
                <text x={loc.x + 45} y={loc.y + 4} fill="#868E96" fontSize="10" textAnchor="middle" style={{ pointerEvents: 'none' }}>
                  ⠿
                </text>
              )}
            </g>
          );
        })}

        {/* ---- Location Nodes — Sub-locations (Cedarwood children) ---- */}
        {subLocs.map((loc) => {
          const isSelected = selectedLocationId === loc.id;
          const color = getLocationColor(loc.id);
          const parent = loc.parentId ? locationMap.get(loc.parentId) : null;
          const hasVisibleParentLink = !!loc.parentId && links.some(
            (l) =>
              ((l.from === loc.parentId && l.to === loc.id) ||
                (l.from === loc.id && l.to === loc.parentId)) &&
              layerVisibility[l.layer] &&
              (l.layer === 'existing' || linkTypeVisibility[l.type])
          );

          return (
            <g key={loc.id}>
              {/* Structural parent relationship (grey dashed) when no layer link is visible */}
              {parent && !hasVisibleParentLink && (
                <line
                  x1={parent.x} y1={parent.y + 20}
                  x2={loc.x} y2={loc.y - 12}
                  stroke="#9CA3AF"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                  opacity="0.7"
                />
              )}

              <g
                className={`nc-node nc-subnode ${editMode ? 'nc-node--editable' : ''}`}
                onClick={() => handleNodeClick(loc)}
                onMouseDown={(e) => handleNodeMouseDown(e, loc)}
                filter={isSelected ? 'url(#nc-shadow-sel)' : 'url(#nc-shadow)'}
              >
                {/* Smaller pill */}
                <rect
                  x={loc.x - 50}
                  y={loc.y - 14}
                  width={100}
                  height={28}
                  rx="6"
                  fill="white"
                  stroke={isSelected ? color : '#E9ECEF'}
                  strokeWidth={isSelected ? 2 : 1}
                />

                {/* Small color dot */}
                <circle
                  cx={loc.x - 38}
                  cy={loc.y}
                  r="5"
                  fill={color}
                  stroke="white"
                  strokeWidth="1.5"
                />

                {/* Label */}
                <text
                  x={loc.x - 28}
                  y={loc.y + 3.5}
                  fill="#495057"
                  fontSize="10"
                  fontWeight="600"
                  fontFamily="var(--font-family)"
                  style={{ pointerEvents: 'none' }}
                >
                  {loc.name}
                </text>

                {/* ---- Equipment indicator dots ---- */}
                {(() => {
                  const locEquipment = equipment.filter((eq) => eq.locationId === loc.id);
                  if (locEquipment.length === 0) return null;
                  const layersPresent = [...new Set(locEquipment.map((eq) => eq.layer))];
                  return layersPresent.map((layer, i) => {
                    if (!layerVisibility[layer]) return null;
                    const eqColor = LAYER_COLORS[layer];
                    const cx = loc.x + 34 + i * 11;
                    const cy = loc.y - 2;
                    return (
                      <g key={`eq-dot-${layer}`}>
                        <circle cx={cx} cy={cy} r="4" fill={eqColor} stroke="white" strokeWidth="1.5" />
                        {i === layersPresent.length - 1 && (
                          <text x={cx + 6} y={cy + 3} fill="#868E96" fontSize="8" fontWeight="600" style={{ pointerEvents: 'none' }}>
                            {locEquipment.length}
                          </text>
                        )}
                      </g>
                    );
                  });
                })()}

                {/* Drag handle */}
                {editMode && (
                  <text x={loc.x + 38} y={loc.y + 3.5} fill="#868E96" fontSize="9" textAnchor="middle" style={{ pointerEvents: 'none' }}>
                    ⠿
                  </text>
                )}
              </g>
            </g>
          );
        })}

        {/* Grid border */}
        <rect
          x={0}
          y={0}
          width={GRID_W}
          height={GRID_H}
          fill="none"
          stroke="#CED4DA"
          strokeWidth="2"
          opacity="0.5"
          rx="4"
        />
      </svg>

      {/* ---- Link properties modal ---- */}
      {pendingLink && (
        <div className="nc-link-modal-overlay" onClick={() => setPendingLink(null)}>
          <div className="nc-link-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{pendingLink.id ? '✎ Edit Link' : '🔗 Add Link'}</h3>
            <p className="nc-link-modal__sub">
              {locationMap.get(pendingLink.from)?.name || 'Source'} →{' '}
              {locationMap.get(pendingLink.to)?.name || 'Target'}
            </p>

            <div className="nc-link-modal__field">
              <label className="nc-link-modal__label">Link type</label>
              <div className="nc-link-modal__options">
                {(['fibre', 'ethernet', 'wireless'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={`nc-link-modal__opt ${draftType === t ? 'nc-link-modal__opt--active' : ''}`}
                    style={draftType === t ? { borderColor: LINK_TYPE_COLORS[t], boxShadow: `0 0 0 1px ${LINK_TYPE_COLORS[t]}` } : undefined}
                    onClick={() => setDraftType(t)}
                  >
                    <span className="nc-link-modal__opt-dot" style={{ background: LINK_TYPE_COLORS[t] }} />
                    {LINK_TYPE_LABELS[t]}
                  </button>
                ))}
              </div>
            </div>

            <div className="nc-link-modal__field">
              <label className="nc-link-modal__label">Layer</label>
              <div className="nc-link-modal__options">
                {(['existing', 'verse', 'scl', 'remove', 'future'] as Layer[]).map((l) => (
                  <button
                    key={l}
                    type="button"
                    className={`nc-link-modal__opt ${draftLayer === l ? 'nc-link-modal__opt--active' : ''}`}
                    style={draftLayer === l ? { borderColor: LAYER_COLORS[l], boxShadow: `0 0 0 1px ${LAYER_COLORS[l]}` } : undefined}
                    onClick={() => setDraftLayer(l)}
                  >
                    <span className="nc-link-modal__opt-dot" style={{ background: LAYER_COLORS[l] }} />
                    {LAYER_LABELS[l]}
                  </button>
                ))}
              </div>
            </div>

            <div className="nc-link-modal__actions">
              <button type="button" className="nc-link-modal__btn" onClick={() => setPendingLink(null)}>
                Cancel
              </button>
              <button type="button" className="nc-link-modal__btn nc-link-modal__btn--primary" onClick={confirmLink}>
                {pendingLink.id ? 'Save Changes' : 'Add Link'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Map location IDs to their primary layer */
function getLocationLayer(id: string): Layer {
  switch (id) {
    case 'cedarwood':
    case 'school-area':
      return 'existing';
    case 'admin':
    case 'factory':
    case 'cow-shed':
      return 'verse';
    case 'greenhouse':
      return 'future';
    // Cedarwood sub-locations: inherit parent's existing layer for node color,
    // but equipment on them spans existing/remove/verse/scl layers
    case 'supermarket':
    case 'conference-hall':
    case 'conference-room':
    case 'kitchen':
    case 'cafeteria':
    case 'gazebos':
      return 'existing';
    default:
      return 'existing';
  }
}
