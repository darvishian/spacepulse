/**
 * Globe feature types and interfaces
 */

import type { Viewer as CesiumViewer, Entity as CesiumEntity, Clock as CesiumClock } from 'cesium';

// ── Layer system ──────────────────────────────────────────────

export enum LayerType {
  SATELLITES = 'satellites',
  LAUNCHES = 'launches',
  WEATHER = 'weather',
  GROUND_STATIONS = 'ground_stations',
  INVESTMENTS = 'investments',
}

export interface LayerConfig {
  id: string;
  name: string;
  type: LayerType;
  visible: boolean;
  opacity: number;
  dataSourceId?: string;
  properties?: Record<string, unknown>;
}

/** Default layer definitions used at startup */
export const DEFAULT_LAYERS: LayerConfig[] = [
  { id: 'satellites', name: 'Satellites', type: LayerType.SATELLITES, visible: true, opacity: 1 },
  { id: 'launches', name: 'Launches', type: LayerType.LAUNCHES, visible: true, opacity: 1 },
  { id: 'weather', name: 'Weather', type: LayerType.WEATHER, visible: false, opacity: 1 },
  { id: 'ground_stations', name: 'Ground Stations', type: LayerType.GROUND_STATIONS, visible: false, opacity: 1 },
  { id: 'investments', name: 'Investments', type: LayerType.INVESTMENTS, visible: false, opacity: 1 },
];

// ── Entity model ──────────────────────────────────────────────

export interface GlobeEntity {
  id: string;
  name: string;
  type: string;
  position: {
    latitude: number;
    longitude: number;
    altitude?: number;
  };
  properties?: Record<string, unknown>;
}

// ── Camera ────────────────────────────────────────────────────

export interface CameraState {
  latitude: number;
  longitude: number;
  altitude: number;
  heading?: number;
  pitch?: number;
  roll?: number;
}

// ── Clock / time simulation ───────────────────────────────────

export type TimeScale = 'real-time' | '1x' | '2x' | '10x' | '60x';

/** Multiplier that maps each TimeScale label to a Cesium clock multiplier */
export const TIME_SCALE_MULTIPLIERS: Record<TimeScale, number> = {
  'real-time': 1,
  '1x': 1,
  '2x': 2,
  '10x': 10,
  '60x': 60,
};

export interface ClockState {
  currentTime: Date;
  isPlaying: boolean;
  timeScale: TimeScale;
  /** Cesium JulianDate range — start */
  startTime?: Date;
  /** Cesium JulianDate range — end */
  stopTime?: Date;
}

// ── Viewer wrapper ────────────────────────────────────────────

/**
 * Thin wrapper around the raw CesiumViewer so the rest of the
 * codebase does not import cesium directly.
 */
export interface GlobeViewerInstance {
  viewer: CesiumViewer | null;
  clock: CesiumClock | null;
  addEntity: (entity: GlobeEntity) => CesiumEntity | null;
  removeEntity: (entityId: string) => void;
  removeAllEntities: () => void;
  setCameraView: (view: CameraState) => void;
  flyTo: (entityId: string) => void;
}

// ── Globe store ───────────────────────────────────────────────

export interface GlobeStore {
  // Viewer reference (not serializable — excluded from persist)
  viewerRef: CesiumViewer | null;
  setViewerRef: (viewer: CesiumViewer | null) => void;

  // Layers
  layers: LayerConfig[];
  setLayerVisible: (layerId: string, visible: boolean) => void;
  setLayerOpacity: (layerId: string, opacity: number) => void;

  // Clock
  clock: ClockState;
  setIsPlaying: (playing: boolean) => void;
  setTimeScale: (scale: TimeScale) => void;
  setCurrentTime: (time: Date) => void;
  skipTime: (direction: 'forward' | 'backward', hours: number) => void;

  // Entity selection (drives DetailPanel)
  selectedGlobeEntity: GlobeEntity | null;
  setSelectedGlobeEntity: (entity: GlobeEntity | null) => void;
}
