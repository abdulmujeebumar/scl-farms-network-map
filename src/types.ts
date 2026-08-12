// ============================================================
// SCL Farms — Network Remediation & Enhancement Dashboard
// Central data model
// ============================================================

/**
 * Infrastructure layers as defined by the master spec.
 */
export type Layer = 'existing' | 'verse' | 'scl' | 'remove' | 'future';

/**
 * A major farm location / area node.
 */
export interface Location {
  id: string;
  name: string;
  /** Grid X position (0–1000) */
  x: number;
  /** Grid Y position (0–700) */
  y: number;
  description?: string;
  /** If set, this is a sub-location of another location */
  parentId?: string;
}

/**
 * Network equipment placed at a location.
 */
export interface Equipment {
  id: string;
  locationId: string;
  layer: Layer;
  category: string;
  manufacturer?: string;
  model?: string;
  quantity: number;
  unitCost?: number;
  status?: string;
  notes?: string;
}

/**
 * A network link between two locations.
 */
export interface Link {
  id: string;
  from: string;
  to: string;
  layer: Layer;
  type: 'fibre' | 'ethernet' | 'wireless';
  label?: string;
  notes?: string;
}

/**
 * Root data object that holds the entire application state.
 */
export interface FarmMapData {
  locations: Location[];
  equipment: Equipment[];
  links: Link[];
  layerVisibility: Record<Layer, boolean>;
  linkTypeVisibility: { fibre: boolean; ethernet: boolean; wireless: boolean };
  selectedLocationId: string | null;
  editMode: boolean;
}

// ============================================================
// Color system — matches master spec §3
// ============================================================

export const LAYER_COLORS: Record<Layer, string> = {
  existing: '#9CA3AF', // grey
  verse: '#3B82F6',    // blue
  scl: '#22C55E',      // green
  remove: '#F97316',   // orange/red
  future: '#A855F7',   // purple
};

export const LAYER_LABELS: Record<Layer, string> = {
  existing: 'Existing / Current',
  verse: 'Verse IT Remediation',
  scl: 'SCL Enhancement',
  remove: 'Remove / Replace',
  future: 'Future / Optional',
};

/**
 * Default layer visibility — all layers ON.
 */
export const DEFAULT_VISIBILITY: Record<Layer, boolean> = {
  existing: true,
  verse: true,
  scl: true,
  remove: true,
  future: true,
};

export const DEFAULT_LINK_TYPE_VISIBILITY = {
  fibre: true,
  ethernet: true,
  wireless: true,
};

export const LINK_TYPE_LABELS: Record<string, string> = {
  fibre: 'Fibre',
  ethernet: 'Ethernet',
  wireless: 'Wireless',
};

export const LINK_TYPE_COLORS: Record<string, string> = {
  fibre: '#3B82F6',
  ethernet: '#22C55E',
  wireless: '#A855F7',
};
