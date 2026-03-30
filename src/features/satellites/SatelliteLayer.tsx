/**
 * SatelliteLayer — renders satellite entities on the Cesium globe.
 *
 * Strategy for 20k+ satellites:
 * - Use a single Cesium PointPrimitiveCollection (not individual entities) for max GPU perf
 * - Propagate positions in batches every few seconds
 * - LOD: larger points when camera is close, smaller/hidden when far
 * - Constellation color-coding via a stable color map
 * - Entity selection flow: click → GlobeStore.selectedGlobeEntity → DetailPanel
 */

'use client';

import React, { useCallback, useEffect, useRef } from 'react';
import {
  Cartesian3,
  Cartesian2,
  Color,
  NearFarScalar,
  PointPrimitiveCollection,
  LabelCollection,
  DistanceDisplayCondition,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  defined,
  JulianDate,
} from 'cesium';

import { useGlobeStore } from '../globe/store';
import { LayerType } from '../globe/types';
import { useSatelliteStore } from './store';
import { useSatelliteData, useConstellationData } from './hooks/useSatelliteData';
import { propagateBatch } from './hooks/useTlePropagator';
import type { TleRecord, SatellitePosition } from './types';
import type { GlobeEntity } from '../globe/types';

/**
 * Constellation → color mapping for visual differentiation on the globe.
 * Colors use the SpacePulse neon palette.
 */
const CONSTELLATION_COLORS: Record<string, Color> = {
  STARLINK: Color.fromCssColorString('#00d4ff'),   // Cyan accent
  ONEWEB: Color.fromCssColorString('#ff6b35'),      // Orange warning
  'IRIDIUM': Color.fromCssColorString('#00ff88'),    // Green success
  GPS: Color.fromCssColorString('#ffd700'),          // Gold
  GLONASS: Color.fromCssColorString('#ff4444'),      // Red
  GALILEO: Color.fromCssColorString('#aa88ff'),      // Purple
  BEIDOU: Color.fromCssColorString('#ff88aa'),       // Pink
  GLOBALSTAR: Color.fromCssColorString('#88ffaa'),   // Mint
  PLANET: Color.fromCssColorString('#ffaa44'),       // Amber
  SPIRE: Color.fromCssColorString('#44aaff'),        // Light blue
  TELESAT: Color.fromCssColorString('#ff44aa'),      // Magenta
};
const DEFAULT_SAT_COLOR = Color.fromCssColorString('#888888'); // Unknown/other

/** Identify constellation from satellite name (heuristic). */
function guessConstellation(name: string): string {
  const upper = name.toUpperCase();
  if (upper.includes('STARLINK')) return 'STARLINK';
  if (upper.includes('ONEWEB')) return 'ONEWEB';
  if (upper.includes('IRIDIUM')) return 'IRIDIUM';
  if (upper.includes('GPS') || upper.includes('NAVSTAR')) return 'GPS';
  if (upper.includes('GLONASS') || upper.includes('COSMOS')) return 'GLONASS';
  if (upper.includes('GALILEO') || upper.includes('GSAT')) return 'GALILEO';
  if (upper.includes('BEIDOU') || upper.includes('CZ-')) return 'BEIDOU';
  if (upper.includes('GLOBALSTAR')) return 'GLOBALSTAR';
  if (upper.includes('FLOCK') || upper.includes('DOVE') || upper.includes('SKYSAT')) return 'PLANET';
  if (upper.includes('SPIRE') || upper.includes('LEMUR')) return 'SPIRE';
  if (upper.includes('TELESAT')) return 'TELESAT';
  return 'OTHER';
}

function getConstellationColor(name: string): Color {
  const constellation = guessConstellation(name);
  return CONSTELLATION_COLORS[constellation] || DEFAULT_SAT_COLOR;
}

/**
 * Propagation update interval in ms.
 * 3 seconds is a good balance between visual smoothness and CPU cost for 20k+ sats.
 */
const PROPAGATION_INTERVAL_MS = 3000;

/**
 * Maximum satellites to render as points.
 * Even with PointPrimitiveCollection, 30k+ can drop frames on low-end GPUs.
 */
const MAX_RENDERED_POINTS = 25000;

export function SatelliteLayer(): React.ReactElement | null {
  const viewer = useGlobeStore((s) => s.viewerRef);
  const layers = useGlobeStore((s) => s.layers);
  const setSatellites = useSatelliteStore((s) => s.setSatellites);
  const setConstellations = useSatelliteStore((s) => s.setConstellations);
  const filters = useSatelliteStore((s) => s.filters);

  const { data: tleData, isLoading } = useSatelliteData();
  const { data: constellationData } = useConstellationData();

  // Refs for Cesium primitives (managed imperatively)
  const pointCollectionRef = useRef<PointPrimitiveCollection | null>(null);
  const labelCollectionRef = useRef<LabelCollection | null>(null);
  const positionsRef = useRef<SatellitePosition[]>([]);
  const tleDataRef = useRef<typeof tleData>([]);

  // Check if satellite layer is visible
  const satelliteLayer = layers.find((l) => l.type === LayerType.SATELLITES);
  const isVisible = satelliteLayer?.visible ?? true;

  // Sync constellation data to store
  useEffect(() => {
    if (constellationData && constellationData.length > 0) {
      setConstellations(constellationData);
    }
  }, [constellationData, setConstellations]);

  // Keep TLE data ref in sync
  useEffect(() => {
    if (tleData && tleData.length > 0) {
      tleDataRef.current = tleData;
    }
  }, [tleData]);

  /**
   * Apply constellation filter to TLE data.
   */
  const getFilteredTles = useCallback((): TleRecord[] => {
    let tles = tleDataRef.current;
    if (!tles || tles.length === 0) return [];

    if (filters.constellationId) {
      const cid = filters.constellationId.toUpperCase();
      tles = tles.filter((t) => guessConstellation(t.name).toUpperCase() === cid);
    }

    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      tles = tles.filter((t) => t.name.toLowerCase().includes(q));
    }

    // Cap for performance
    return tles.slice(0, MAX_RENDERED_POINTS);
  }, [filters]);

  /**
   * Create / rebuild PointPrimitiveCollection with current positions.
   */
  const updatePoints = useCallback(
    (positions: SatellitePosition[]): void => {
      if (!viewer || viewer.isDestroyed()) return;

      // Remove old collections
      if (pointCollectionRef.current) {
        viewer.scene.primitives.remove(pointCollectionRef.current);
        pointCollectionRef.current = null;
      }
      if (labelCollectionRef.current) {
        viewer.scene.primitives.remove(labelCollectionRef.current);
        labelCollectionRef.current = null;
      }

      if (!isVisible || positions.length === 0) return;

      // Create new point collection
      const points = new PointPrimitiveCollection();

      for (let i = 0; i < positions.length; i++) {
        const pos = positions[i];
        const color = getConstellationColor(pos.name);
        const cartesian = Cartesian3.fromDegrees(
          pos.longitude,
          pos.latitude,
          (pos.altitude || 400) * 1000, // km → meters
        );

        points.add({
          position: cartesian,
          pixelSize: 2.5,
          color,
          outlineColor: Color.BLACK,
          outlineWidth: 0.5,
          scaleByDistance: new NearFarScalar(1e6, 3.0, 1e8, 0.5),
          distanceDisplayCondition: new DistanceDisplayCondition(0, 5e8),
          id: i, // Numeric index — Cesium requires string|number for pick IDs
        });
      }

      viewer.scene.primitives.add(points);
      pointCollectionRef.current = points;

      // Request a render since we're in requestRenderMode
      viewer.scene.requestRender();
    },
    [viewer, isVisible],
  );

  /**
   * Main propagation + render loop.
   */
  useEffect(() => {
    if (!viewer || viewer.isDestroyed() || !tleData || tleData.length === 0) return;

    let disposed = false;

    const propagateAndRender = (): void => {
      if (disposed) return;

      const filteredTles = getFilteredTles();
      if (filteredTles.length === 0) {
        updatePoints([]);
        return;
      }

      // Get current time from Cesium clock (supports time scrubber)
      const cesiumTime = viewer.clock.currentTime;
      const jsDate = JulianDate.toDate(cesiumTime);

      // Batch propagate all TLEs
      const positions = propagateBatch(filteredTles, jsDate);

      positionsRef.current = positions;

      // Update store (for other components like DetailPanel)
      setSatellites(positions);

      // Render points on globe
      updatePoints(positions);
    };

    // Initial propagation
    propagateAndRender();

    // Set up recurring propagation
    const interval = setInterval(propagateAndRender, PROPAGATION_INTERVAL_MS);

    return () => {
      disposed = true;
      clearInterval(interval);

      // Clean up primitives
      if (pointCollectionRef.current && viewer && !viewer.isDestroyed()) {
        viewer.scene.primitives.remove(pointCollectionRef.current);
        pointCollectionRef.current = null;
      }
      if (labelCollectionRef.current && viewer && !viewer.isDestroyed()) {
        viewer.scene.primitives.remove(labelCollectionRef.current);
        labelCollectionRef.current = null;
      }
    };
  }, [viewer, tleData, isVisible, getFilteredTles, updatePoints, setSatellites]);

  /**
   * Handle satellite click via the viewer's pick mechanism.
   * We add a postRender listener that checks if a point was clicked.
   */
  useEffect(() => {
    if (!viewer || viewer.isDestroyed()) return;

    const handler = new ScreenSpaceEventHandler(viewer.scene.canvas);

    handler.setInputAction(
      (movement: { position: Cartesian2 }) => {
        const picked = viewer.scene.pick(movement.position);
        if (defined(picked) && picked.primitive instanceof PointPrimitiveCollection) {
          const pointIndex = picked.id;
          if (typeof pointIndex === 'number' && positionsRef.current) {
            const satPos = positionsRef.current[pointIndex];
            if (satPos) {
              const globeEntity: GlobeEntity = {
                id: satPos.id,
                name: satPos.name,
                type: 'satellite',
                position: {
                  latitude: satPos.latitude,
                  longitude: satPos.longitude,
                  altitude: satPos.altitude,
                },
                properties: {
                  velocity: satPos.velocity,
                  heading: satPos.heading,
                  footprint: satPos.footprint,
                  constellation: guessConstellation(satPos.name),
                },
              };

              // Clear any tracked entity first to prevent Cesium from
              // trying to resolve the picked primitive as an Entity
              viewer.trackedEntity = undefined;

              useGlobeStore.getState().setSelectedGlobeEntity(globeEntity);
              useSatelliteStore.getState().setSelectedSatellite(satPos.id);

              // Fly camera directly — don't use viewer.flyTo (which expects Entities)
              viewer.camera.flyTo({
                destination: Cartesian3.fromDegrees(
                  satPos.longitude,
                  satPos.latitude,
                  (satPos.altitude || 400) * 1000 + 500000,
                ),
                duration: 1.5,
              });
            }
          }
        }
      },
      ScreenSpaceEventType.LEFT_CLICK,
    );

    return () => {
      if (!handler.isDestroyed()) {
        handler.destroy();
      }
    };
  }, [viewer]);

  // Status overlay
  const satCount = positionsRef.current?.length ?? 0;
  const totalTles = tleData?.length ?? 0;

  return (
    <div className="absolute bottom-4 left-4 text-xs text-gray-400 pointer-events-none z-10">
      {isLoading ? (
        <div className="text-space-accent animate-pulse">Loading satellite data...</div>
      ) : (
        <div>
          Satellites: {satCount.toLocaleString()}{' '}
          {totalTles > satCount && `/ ${totalTles.toLocaleString()} total`}
          {filters.constellationId && (
            <span className="ml-1 text-space-accent">
              [{filters.constellationId}]
            </span>
          )}
        </div>
      )}
    </div>
  );
}
