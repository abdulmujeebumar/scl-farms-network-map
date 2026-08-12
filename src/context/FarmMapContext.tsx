// ============================================================
// SCL Farms — FarmMapContext
// Central state management with localStorage persistence
// ============================================================

import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import type { FarmMapData, Location, Equipment, Link, Layer } from '../types';
import { initialData } from '../data/initialData';

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

    case 'ADD_LOCATION':
      return { ...state, locations: [...state.locations, action.payload] };

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

const STORAGE_KEY = 'scl-farms-network-map-v6';

interface FarmMapContextValue {
  data: FarmMapData;
  dispatch: React.Dispatch<Action>;
  selectedLocation: Location | null;
}

const FarmMapContext = createContext<FarmMapContextValue | null>(null);

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
      return parsed as FarmMapData;
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
  const [data, dispatch] = useReducer(reducer, null, () => {
    return loadPersistedState() || initialData;
  });

  // Persist on every change
  useEffect(() => {
    persistState(data);
  }, [data]);

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
