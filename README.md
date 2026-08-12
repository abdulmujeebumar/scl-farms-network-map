# SCL Farms — Network Remediation & Enhancement Dashboard

Interactive network planning dashboard for SCL Farms, Kwali, Abuja. Built with **React 18 + TypeScript + Vite**.

## Features

- **SVG schematic grid map** with pan, zoom, and draggable nodes
- **6 top-level + 10 Cedarwood sub-locations** with drill-down on click
- **5 infrastructure layers**: Existing / Verse IT / SCL Enhancement / Remove / Future
- **3 link types**: Fibre (pulsing), Ethernet (solid), Wireless (signal animation)
- **Visio-style drag-to-connect** link creation
- **Interactive legend** with layer + link type toggles
- **Equipment management** — layer-grouped, add/edit/remove in Edit Mode
- **Cost Summary** — Naira (₦) with editable unit costs and live totals
- **Export**: PNG image, PDF, CSV costing spreadsheet
- **Resizable sidebar** with location detail + cost panel
- **LocalStorage persistence** — all edits survive page reload
- **Presentation-ready** — clean UI suitable for management review

## Quick Start

```bash
npm install
npm start
```

Opens at `http://localhost:5173`.

## Production Build

```bash
npm run build
npm run preview
```

## Color System

| Layer | Color | Description |
|-------|-------|-------------|
| Existing / Current | Grey `#9CA3AF` | Physically verified infrastructure |
| Verse IT Remediation | Blue `#3B82F6` | Agreed remediation scope |
| SCL Enhancement | Green `#22C55E` | SCL-funded additions |
| Remove / Replace | Orange `#F97316` | Equipment to decommission |
| Future / Optional | Purple `#A855F7` | Out-of-scope future work |

## Link Types

| Type | Visual | Use |
|------|--------|-----|
| Fibre | Blue pulsing dash | Verse IT backbone |
| Ethernet | Green solid | Cedarwood internal LAN |
| Wireless | Purple opacity pulse | Existing backhaul |

## Tech Stack

- React 18, TypeScript, Vite 5
- CSS Variables, no external map API required

## Credits

Powered by **Koboweb Greentech Group** · © KGTG 2026
