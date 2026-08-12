# Bug Fixes & Adjustments Log

## 2026-08-12

### Sub-location visibility
- **Fix**: Sub-locations now only appear when parent is clicked, and persist when navigating between siblings
- **Fix**: Clicking a sub-location no longer collapses the parent's expanded view
- **Fix**: Removed layer visibility check that incorrectly blocked sub-locations from rendering

### Link filtering
- **Fix**: Existing wireless links now controlled by "Existing / Current" toggle, not "Wireless" toggle
- **Fix**: Sub-location Ethernet links now hide/show with parent expand/collapse
- **Fix**: Link type toggles (Fibre/Ethernet/Wireless) only apply to non-existing links

### Layer toggles
- **Fix**: Location nodes always visible; layer toggles now correctly only hide equipment/links
- **Fix**: Cedarwood and School Area correctly show as existing (grey) layer

### Costs
- **Fix**: Cost inputs changed from uncontrolled (`defaultValue`) to controlled (`value`) — totals now update live as you type
- **Fix**: Cost Summary now only shows SCL Enhancement (Verse IT is no-cost remediation)
- **Fix**: Negative values blocked on cost inputs (min="0")

### Caching
- **Fix**: Browser caching prevented changes from appearing — added `Cache-Control: no-store` headers, no-cache meta tags, and `--force` flag for Vite
- **Fix**: localStorage key bumped multiple times (v3→v4→v5→v6) to prevent stale data crashes

### UI/UX
- **Fix**: Zoom sensitivity reduced from 12% to 6% per scroll tick
- **Fix**: Drag sensitivity reduced with 0.6× damping
- **Fix**: Location names now editable in Edit Mode
- **Fix**: Sidebar made resizable with drag handle (200px–500px)
- **Fix**: Click toggle for parent locations (Cedarwood expand/collapse), not for child nodes

### Data model
- **Fix**: Supermarket and Conference Hall moved inside Cedarwood as sub-locations
- **Fix**: Added Conference Room, Kitchen, Cafeteria, Gazebos as Cedarwood sub-locations
- **Fix**: Added Server Room, Ground/First/Second Floor as Cedarwood drill-down
- **Fix**: Greenhouse repositioned between Admin and Cow Shed, marked future SCL
- **Fix**: Factory and Production Area unified (no duplicate nodes)
- **Fix**: TP-Link Deco mesh marked as Remove/Replace (orange) — not part of target architecture

### Export
- **Fix**: PNG export renders SVG canvas at 2× resolution
- **Fix**: PDF export uses print-optimized CSS (hides toolbars and edit controls)
- **Fix**: CSV export includes UTF-8 BOM for Excel compatibility

### Infrastructure
- **Fix**: Added `npm start` script (was missing, only `npm run dev` worked)
- **Fix**: .gitignore created for node_modules, dist, .vite cache
