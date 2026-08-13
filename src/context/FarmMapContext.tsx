// ============================================================
// SCL Farms — FarmMapContext
// Central state management with localStorage persistence
// ============================================================

import React, { createContext, useContext, useReducer, useCallback, useEffect, useState, useRef } from 'react';
import type { FarmMapData, Location, Equipment, Link, Layer } from '../types';
import { initialData } from '../data/initialData';
import { saveToCloud, loadFromCloud, subscribeToCloud } from '../firebase';

// ============================================================
// Actions
// ============================================================

type Action =
  | { type: 'SET_DATA'; payload: FarmMapData }
  | { type: 'UPDATE_LOCATION'; payload: Location }
  | { type: 'ADD_LOCATION'; payload: Location }
  | { type: 'REMOVE_LOCATION'; payload: string }
  | { type: 'SELECT_LOCATION'; payload: string | null }
  | { type: 'TOGGLE_LAYER'; payload: Layer }
  | { type: 'TOGGLE_LINK_TYPE'; payload: 'fibre' | 'ethernet' | 'wireless' }
  | { type: 'SET_EDIT_MODE'; payload: boolean }
  | { type: 'SET_AUTH'; payload: boolean }
  | { type: 'ADD_EQUIPMENT'; payload: Equipment }
  | { type: 'UPDATE_EQUIPMENT'; payload: Equipment }
  | { type: 'REMOVE_EQUIPMENT'; payload: string }
  | { type: 'ADD_LINK'; payload: Link }
  | { type: 'UPDATE_LINK'; payload: Link }
  | { type: 'REMOVE_LINK'; payload: string }
  | { type: 'RESET_DATA' };

// ============================================================
// Reducer
// ============================================================

function reducer(state: FarmMapData, action: Action): FarmMapData {
  switch (action.type) {
    case 'SET_DATA':
      return { ...action.payload };

    case 'UPDATE_LOCATION': {
      const index = state.locations.findIndex(
        (loc) => loc.id === action.payload.id,
      );
      if (index === -1) return state;
      const updated = [...state.locations];
      updated[index] = action.payload;
      return { ...state, locations: updated };
    }

    case 'ADD_LOCATION': {
      const loc = action.payload;
      const links = loc.parentId
        ? [
            ...state.links,
            {
              id: `link-${loc.parentId}-${loc.id}`,
              from: loc.parentId,
              to: loc.id,
              layer: 'scl' as const,
              type: 'ethernet' as const,
              label: 'Ethernet',
            },
          ]
        : state.links;
      return { ...state, locations: [...state.locations, loc], links };
    }

    case 'REMOVE_LOCATION':
      return {
        ...state,
        locations: state.locations.filter((l) => l.id !== action.payload),
        equipment: state.equipment.filter((e) => e.locationId !== action.payload),
        links: state.links.filter(
          (l) => l.from !== action.payload && l.to !== action.payload,
        ),
        selectedLocationId:
          state.selectedLocationId === action.payload
            ? null
            : state.selectedLocationId,
      };

    case 'ADD_EQUIPMENT':
      return { ...state, equipment: [...state.equipment, action.payload] };

    case 'UPDATE_EQUIPMENT': {
      const idx = state.equipment.findIndex((e) => e.id === action.payload.id);
      if (idx === -1) return state;
      const updated = [...state.equipment];
      updated[idx] = action.payload;
      return { ...state, equipment: updated };
    }

    case 'REMOVE_EQUIPMENT':
      return {
        ...state,
        equipment: state.equipment.filter((e) => e.id !== action.payload),
      };

    case 'ADD_LINK':
      return { ...state, links: [...state.links, action.payload] };

    case 'UPDATE_LINK': {
      const idx = state.links.findIndex((l) => l.id === action.payload.id);
      if (idx === -1) return state;
      const updated = [...state.links];
      updated[idx] = action.payload;
      return { ...state, links: updated };
    }

    case 'REMOVE_LINK':
      return {
        ...state,
        links: state.links.filter((l) => l.id !== action.payload),
      };

    case 'SELECT_LOCATION':
      return { ...state, selectedLocationId: action.payload };

    case 'TOGGLE_LAYER':
      return {
        ...state,
        layerVisibility: {
          ...state.layerVisibility,
          [action.payload]: !state.layerVisibility[action.payload],
        },
      };

    case 'TOGGLE_LINK_TYPE':
      return {
        ...state,
        linkTypeVisibility: {
          ...state.linkTypeVisibility,
          [action.payload]: !state.linkTypeVisibility[action.payload],
        },
      };

    case 'SET_EDIT_MODE':
      return { ...state, editMode: action.payload };

    case 'SET_AUTH':
      return { ...state, isAuthenticated: action.payload, editMode: action.payload ? state.editMode : false };

    case 'RESET_DATA':
      return { ...initialData, layerVisibility: { ...initialData.layerVisibility } };

    default:
      return state;
  }
}

// ============================================================
// Context
// ============================================================

const STORAGE_KEY = 'scl-farms-network-map-v7';
const PASSWORD_KEY = 'scl-farms-admin-pw';
const DEFAULT_PASSWORD = 'scladmin2026';

export function getStoredPassword(): string {
  try {
    return localStorage.getItem(PASSWORD_KEY) || DEFAULT_PASSWORD;
  } catch {
    return DEFAULT_PASSWORD;
  }
}

export function setStoredPassword(newPw: string): void {
  try {
    localStorage.setItem(PASSWORD_KEY, newPw);
  } catch { /* ignore */ }
}

interface FarmMapContextValue {
  data: FarmMapData;
  dispatch: React.Dispatch<Action>;
  selectedLocation: Location | null;
}

const FarmMapContext = createContext<FarmMapContextValue | null>(null);

/**
 * Guarantee that every sub-location has an Ethernet link back to its parent.
 * Existing links are preserved; only missing parent links are added.
 */
function ensureSubLocationLinks(data: FarmMapData): FarmMapData {
  const existing = new Set(data.links.map((l) => `${l.from}->${l.to}`));
  let added = false;
  const links = [...data.links];
  data.locations.forEach((loc) => {
    if (!loc.parentId) return;
    const key = `${loc.parentId}->${loc.id}`;
    if (existing.has(key)) return;
    existing.add(key);
    links.push({
      id: `link-${loc.parentId}-${loc.id}`,
      from: loc.parentId,
      to: loc.id,
      layer: 'scl',
      type: 'ethernet',
      label: 'Ethernet',
    });
    added = true;
  });
  return added ? { ...data, links } : data;
}

function loadPersistedState(): FarmMapData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.locations)) {
      // Ensure new fields have defaults
      if (!parsed.linkTypeVisibility) {
        parsed.linkTypeVisibility = { fibre: true, ethernet: true, wireless: true };
      }
      return ensureSubLocationLinks(parsed as FarmMapData);
    }
  } catch {
    console.warn('Could not restore persisted state; using initial data.');
  }
  return null;
}

function persistState(state: FarmMapData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    console.warn('Could not persist state.');
  }
}

export function FarmMapProvider({ children }: { children: React.ReactNode }) {
  const [cloudReady, setCloudReady] = useState(false);
  const isCloudUpdate = useRef(false);

  const [data, dispatch] = useReducer(reducer, null, () => {
    return loadPersistedState() || initialData;
  });

  // Load from cloud on mount
  useEffect(() => {
    loadFromCloud().then((cloudData) => {
      if (cloudData) {
        isCloudUpdate.current = true;
        dispatch({ type: 'SET_DATA', payload: ensureSubLocationLinks(cloudData) });
      }
      setCloudReady(true);
    });
  }, []);

  // Subscribe to real-time cloud updates
  useEffect(() => {
    if (!cloudReady) return;
    const unsub = subscribeToCloud((cloudData) => {
      isCloudUpdate.current = true;
      dispatch({ type: 'SET_DATA', payload: cloudData });
    });
    return unsub;
  }, [cloudReady]);

  // Persist to localStorage + cloud on every change (skip cloud-originated updates)
  useEffect(() => {
    persistState(data);
    if (cloudReady && !isCloudUpdate.current) {
      saveToCloud(data);
    }
    isCloudUpdate.current = false;
  }, [data, cloudReady]);

  const selectedLocation = data.selectedLocationId
    ? data.locations.find((loc) => loc.id === data.selectedLocationId) || null
    : null;

  return (
    <FarmMapContext.Provider value={{ data, dispatch, selectedLocation }}>
      {children}
    </FarmMapContext.Provider>
  );
}

export function useFarmMap(): FarmMapContextValue {
  const context = useContext(FarmMapContext);
  if (!context) {
    throw new Error('useFarmMap must be used within a FarmMapProvider');
  }
  return context;
}
