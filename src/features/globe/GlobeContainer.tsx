/**
 * Globe container — initializes a raw CesiumJS Viewer imperatively.
 *
 * We use Cesium directly (no Resium) to avoid Resium's CJS/ESM
 * bundling incompatibility with Next.js 15's client bundler.
 *
 * Responsibilities:
 * - Initialize Cesium Viewer with ion token, terrain, and imagery
 * - Mouse/touch orbit, zoom, tilt (Cesium defaults + custom settings)
 * - Entity click → DetailPanel flow via GlobeStore + RootStore
 * - Expose viewer ref to the store so other features can add entities
 */

'use client';

import React, { useCallback, useEffect, useRef } from 'react';
import {
  Ion,
  Viewer as CesiumViewer,
  Cartesian2,
  Cartesian3,
  Color,
  ScreenSpaceEventType,
  ScreenSpaceEventHandler,
  defined,
  Math as CesiumMath,
  JulianDate,
  ClockRange,
  ClockStep,
  createWorldTerrainAsync,
} from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';

import { useGlobeStore } from './store';
import { useStore } from '@/lib/store';
import { GlobeControls } from './GlobeControls';
import type { GlobeEntity } from './types';
import { TIME_SCALE_MULTIPLIERS } from './types';

// Cesium static asset path — served from public/cesium via next.config.ts
if (typeof window !== 'undefined') {
  window.CESIUM_BASE_URL = '/cesium';
}

// Configure Ion token from env
const ION_TOKEN = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN ?? '';
if (ION_TOKEN) {
  Ion.defaultAccessToken = ION_TOKEN;
}

/**
 * Core globe component. Creates a Cesium Viewer in a container div
 * and manages terrain, imagery, controls, clock sync, and entity selection.
 */
export function GlobeContainer(): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerInstanceRef = useRef<CesiumViewer | null>(null);
  const handlerRef = useRef<ScreenSpaceEventHandler | null>(null);

  // Globe store
  const setViewerRef = useGlobeStore((s) => s.setViewerRef);
  const clock = useGlobeStore((s) => s.clock);
  const layers = useGlobeStore((s) => s.layers);

  // ── Initialize Cesium Viewer on mount ───────────────────────
  useEffect(() => {
    if (!containerRef.current || viewerInstanceRef.current) return;

    const viewer = new CesiumViewer(containerRef.current, {
      timeline: false,
      animation: false,
      homeButton: false,
      geocoder: false,
      navigationHelpButton: false,
      baseLayerPicker: false,
      fullscreenButton: false,
      vrButton: false,
      sceneModePicker: false,
      selectionIndicator: true,
      infoBox: false,
      clockViewModel: undefined,
    });

    viewerInstanceRef.current = viewer;
    setViewerRef(viewer);

    // Terrain (async)
    createWorldTerrainAsync()
      .then((terrain) => {
        if (!viewer.isDestroyed()) {
          viewer.terrainProvider = terrain;
        }
      })
      .catch((err) => {
        console.warn('[Globe] Terrain load failed, using ellipsoid:', err);
      });

    // Scene settings
    const scene = viewer.scene;
    scene.globe.enableLighting = true;
    scene.globe.showGroundAtmosphere = true;
    scene.fog.enabled = true;
    if (scene.skyAtmosphere) {
      scene.skyAtmosphere.show = true;
    }
    scene.backgroundColor = Color.fromCssColorString('#0a0a2a');

    // Performance: request render only when needed
    scene.requestRenderMode = true;
    scene.maximumRenderTimeChange = Infinity;

    // Clock defaults
    viewer.clock.clockRange = ClockRange.UNBOUNDED;
    viewer.clock.clockStep = ClockStep.SYSTEM_CLOCK_MULTIPLIER;
    viewer.clock.shouldAnimate = true;

    // Camera defaults — overview of Earth
    viewer.camera.setView({
      destination: Cartesian3.fromDegrees(0, 20, 25_000_000),
      orientation: {
        heading: CesiumMath.toRadians(0),
        pitch: CesiumMath.toRadians(-90),
        roll: 0,
      },
    });

    // ── Entity click handler ────────────────────────────────
    const handler = new ScreenSpaceEventHandler(scene.canvas);
    handlerRef.current = handler;

    handler.setInputAction(
      (movement: { position: Cartesian2 }) => {
        const picked = scene.pick(movement.position);
        if (!defined(picked) || !defined(picked.id)) return;

        // Only handle actual Cesium Entities here.
        // PointPrimitiveCollection picks (satellites) have numeric IDs
        // and are handled by SatelliteLayer's own click handler.
        const entity = picked.id;
        if (typeof entity === 'number' || typeof entity === 'string') return;
        if (!entity.id || !entity.name) return;

        const globeEntity: GlobeEntity = {
          id: entity.id ?? 'unknown',
          name: entity.name ?? 'Unnamed',
          type:
            (entity.properties?.type?.getValue(JulianDate.now()) as string) ??
            'unknown',
          position: { latitude: 0, longitude: 0 },
          properties: {},
        };

        // Resolve cartographic position
        if (entity.position) {
          try {
            const cartesian = entity.position.getValue(JulianDate.now());
            if (cartesian) {
              const carto =
                viewer.scene.globe.ellipsoid.cartesianToCartographic(cartesian);
              globeEntity.position = {
                latitude: CesiumMath.toDegrees(carto.latitude),
                longitude: CesiumMath.toDegrees(carto.longitude),
                altitude: carto.height,
              };
            }
          } catch {
            // Position may not be available for all entities
          }
        }

        // Extract entity properties
        if (entity.properties) {
          const names = entity.properties.propertyNames;
          if (names) {
            for (const pName of names) {
              try {
                globeEntity.properties![pName] =
                  entity.properties[pName]?.getValue(JulianDate.now());
              } catch {
                // skip unreadable properties
              }
            }
          }
        }

        useGlobeStore.getState().setSelectedGlobeEntity(globeEntity);
        useStore.getState().setSelectedEntity(globeEntity.id);
        useStore.getState().setDetailPanelOpen(true);

        viewer.flyTo(entity, { duration: 1.5 });
      },
      ScreenSpaceEventType.LEFT_CLICK
    );

    // ── Cleanup ─────────────────────────────────────────────
    return () => {
      if (handlerRef.current) {
        handlerRef.current.destroy();
        handlerRef.current = null;
      }
      setViewerRef(null);
      if (viewer && !viewer.isDestroyed()) {
        viewer.destroy();
      }
      viewerInstanceRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Sync clock state → Cesium Clock ───────────────────────
  useEffect(() => {
    const viewer = viewerInstanceRef.current;
    if (!viewer || viewer.isDestroyed()) return;

    const cesiumClock = viewer.clock;
    cesiumClock.shouldAnimate = clock.isPlaying;
    cesiumClock.multiplier = TIME_SCALE_MULTIPLIERS[clock.timeScale];
    cesiumClock.currentTime = JulianDate.fromDate(clock.currentTime);
  }, [clock.isPlaying, clock.timeScale, clock.currentTime]);

  // ── Layer toggle handler ──────────────────────────────────
  const handleLayerToggle = useCallback(
    (layerId: string, visible: boolean) => {
      useGlobeStore.getState().setLayerVisible(layerId, visible);
    },
    []
  );

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="w-full h-full bg-space-darker relative">
      {/* Cesium mounts into this div */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Globe controls overlay (layer toggles) */}
      <GlobeControls onLayerToggle={handleLayerToggle} />

      {/* Status overlay */}
      <div className="absolute top-4 left-4 glass rounded-lg p-2 text-xs text-space-accent pointer-events-none z-10">
        <div>
          Layers: {layers.filter((l) => l.visible).length}/{layers.length}
        </div>
        <div>Clock: {clock.isPlaying ? 'Running' : 'Paused'}</div>
        <div>Scale: {clock.timeScale}</div>
      </div>
    </div>
  );
}
