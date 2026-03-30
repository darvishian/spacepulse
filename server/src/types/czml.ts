/**
 * Types for CZML (Cesium Language) document structures
 * CZML is used for describing dynamic geospatial visualization
 */

export interface CzmlPosition {
  epoch: string;
  cartographicDegrees?: number[];
  cartesian?: number[];
}

export interface CzmlProperties {
  [key: string]: unknown;
}

export interface CzmlPacket {
  id: string;
  name?: string;
  description?: string;
  position?: {
    referenceFrame?: string;
    interpolationAlgorithm?: string;
    interpolationDegree?: number;
    epoch?: string;
    cartographicDegrees?: number[];
  };
  path?: {
    resolution?: number;
    material?: CzmlProperties;
    width?: number;
    leadTime?: number;
    trailTime?: number;
  };
  point?: {
    pixelSize?: number;
    color?: number[];
    outlineColor?: number[];
    outlineWidth?: number;
  };
  polyline?: {
    positions?: number[];
    material?: CzmlProperties;
    width?: number;
    clampToGround?: boolean;
  };
  label?: {
    text?: string;
    font?: string;
    style?: string;
    fillColor?: number[];
    pixelOffset?: number[];
  };
  properties?: CzmlProperties;
}

export interface CzmlDocument {
  version: '1.0';
  id?: string;
  name?: string;
  clock?: {
    interval: string;
    currentTime: string;
    multiplier: number;
    range: 'LOOP_STOP' | 'LOOP' | 'TICK_UNLIMITED';
    step: 'SYSTEM_CLOCK_MULTIPLIER' | 'TICK_DEPENDENT';
  };
  packets: CzmlPacket[];
}
