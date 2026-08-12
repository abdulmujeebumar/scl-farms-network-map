# SCL Farms Network Remediation Map

Interactive React + TypeScript + Leaflet map for planning network remediation at SCL Farms, Kwali.

## Architecture
- React 18 + TypeScript + Vite
- Leaflet via react-leaflet for map rendering
- React Context for state management
- CSS Modules for styling
- All data models are fully typed

## Data Flow
- `FarmMapContext` holds all DATA (locations, access points, links, equipment plan)
- Components read from context; edits commit via context dispatch
- LocalStorage persistence layer syncs on every mutation
- Layer visibility is managed through a `layerVisibility` map in context

## Key Files
- `src/types.ts` — All TypeScript interfaces
- `src/data/initialData.ts` — Default DATA object
- `src/context/FarmMapContext.tsx` — State management
- `src/components/MapView.tsx` — Leaflet map with layers
- `src/components/Sidebar.tsx` — Legend toggles, summary, editors
- `src/components/LocationEditor.tsx` — Edit selected location
- `src/components/EquipmentEditor.tsx` — Edit equipment plan
- `src/components/AccessPointEditor.tsx` — Edit AP details and radius
- `src/styles/` — CSS Modules

## Commands
- `npm run dev` — Start development server
- `npm run build` — Production build
- `npm run preview` — Preview production build
