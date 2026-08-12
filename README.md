# SCL Farms — Network Remediation Map

Interactive React application for planning and visualizing network remediation at SCL Farms, Kwali. Built with **React 18 + TypeScript + Leaflet** via **Vite**.

## Features

- **Real map** using OpenStreetMap & satellite tiles (handles zoom levels correctly)
- **Toggleable layers** — show/hide Verse IT, Koboweb, SCL, links, access points, coverage zones
- **Clickable markers** — every location and access point has detailed popups with full metadata
- **Editable locations** — select any marker, edit name, owner, category, device counts, and notes in the sidebar
- **Access point radius editing** — click any AP marker, adjust coverage radius from the popup or sidebar
- **Equipment plan editor** — modify original/enhanced quantities inline; double-all button
- **LocalStorage persistence** — all edits survive page reload
- **JSON export** — download the current state as structured JSON
- **Dark theme UI** — clean, professional dark-mode sidebar with CSS custom properties

## Quick Start

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`.

## Production Build

```bash
npm run build
npm run preview
```

## Project Structure

```
src/
  types.ts                  TypeScript interfaces & constants
  data/initialData.ts       Default map data (locations, APs, links, equipment)
  context/FarmMapContext.tsx React Context + useReducer state management
  App.tsx                   Layout shell
  App.css                   Layout styles
  index.css                 Global reset & CSS variables
  main.tsx                  Entry point
  components/
    MapView.tsx             Leaflet map with markers, popups, polylines, circles
    MapView.css             Map marker & popup styles
    Sidebar.tsx             Main sidebar (summary cards, site editor, sub-panels)
    Sidebar.css             All sidebar, field, legend, equipment styles
    LegendPanel.tsx         Layer visibility toggles with switch inputs
    LocationEditor.tsx      Form to edit selected location (name, owner, category, etc.)
    EquipmentEditor.tsx     Inline equipment plan editor
```

## Data Model

All editable data lives in `src/data/initialData.ts`. The `FarmMapContext` reducer handles mutations and syncs to `localStorage` automatically. You can also edit the initial data file directly in VS Code.

## Editing Workflow

1. Open a marker on the map → sidebar loads the location editor
2. Change name, owner, category, device counts, notes → click **Save Changes**
3. Toggle layers in the Legend panel to focus on specific scopes
4. Use **Double Enhanced Quantities** to preview scaled deployments
5. Click **Export JSON** to download the current plan
