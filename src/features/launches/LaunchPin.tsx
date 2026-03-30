/**
 * LaunchPin — renders launch-site pins on the Cesium globe.
 *
 * Strategy:
 * - Uses Cesium BillboardCollection + LabelCollection for efficient rendering
 * - Color-codes pins by launch status (green=go, yellow=hold, red=no-go, etc.)
 * - Shows rocket name + payload labels (e.g., "Falcon 9 · Starlink Group 12-3")
 * - Click → GlobeStore.selectedGlobeEntity → DetailPanel
 * - Supports both upcoming and recent (faded) launches
 */

'use client';

import React, { useCallback, useEffect, useRef } from 'react';
import {
  Cartesian3,
  Cartesian2,
  Color,
  BillboardCollection,
  LabelCollection,
  VerticalOrigin,
  HorizontalOrigin,
  LabelStyle,
  NearFarScalar,
  DistanceDisplayCondition,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  defined,
} from 'cesium';

import { useGlobeStore } from '../globe/store';
import { LayerType } from '../globe/types';
import { useLaunchStore } from './store';
import { useLaunches, useRecentLaunches } from './hooks/useLaunches';
import { Launch, LaunchStatus, STATUS_COLORS, PROVIDER_LABELS } from './types';
import type { GlobeEntity } from '../globe/types';

/** Pin size in pixels. */
const PIN_SIZE = 14;
const PIN_SIZE_RECENT = 10;

/** Build a color from the status color hex string. */
function getStatusColor(status: LaunchStatus, alpha: number = 1.0): Color {
  const hex = STATUS_COLORS[status] ?? '#888888';
  const c = Color.fromCssColorString(hex);
  return new Color(c.red, c.green, c.blue, alpha);
}

export function LaunchPin(): React.ReactElement | null {
  const viewer = useGlobeStore((s) => s.viewerRef);
  const layers = useGlobeStore((s) => s.layers);

  const setLaunches = useLaunchStore((s) => s.setLaunches);
  const setRecentLaunches = useLaunchStore((s) => s.setRecentLaunches);
  const showRecentLaunches = useLaunchStore((s) => s.showRecentLaunches);

  const { data: upcomingLaunches } = useLaunches();
  const { data: recentLaunches } = useRecentLaunches(30);

  // Refs for Cesium primitives (managed imperatively)
  const billboardCollectionRef = useRef<BillboardCollection | null>(null);
  const labelCollectionRef = useRef<LabelCollection | null>(null);
  const launchesRef = useRef<Launch[]>([]);

  // Check if launches layer is visible
  const launchLayer = layers.find((l) => l.type === LayerType.LAUNCHES);
  const isVisible = launchLayer?.visible ?? true;

  // Sync data to store
  useEffect(() => {
    if (upcomingLaunches && upcomingLaunches.length > 0) {
      setLaunches(upcomingLaunches);
    }
  }, [upcomingLaunches, setLaunches]);

  useEffect(() => {
    if (recentLaunches && recentLaunches.length > 0) {
      setRecentLaunches(recentLaunches);
    }
  }, [recentLaunches, setRecentLaunches]);

  /**
   * Render launch pins + labels on the globe.
   */
  const renderPins = useCallback((): void => {
    if (!viewer || viewer.isDestroyed()) return;

    // Remove old collections
    if (billboardCollectionRef.current) {
      viewer.scene.primitives.remove(billboardCollectionRef.current);
      billboardCollectionRef.current = null;
    }
    if (labelCollectionRef.current) {
      viewer.scene.primitives.remove(labelCollectionRef.current);
      labelCollectionRef.current = null;
    }

    if (!isVisible) return;

    // Combine upcoming + optional recent launches
    const allLaunches: Array<{ launch: Launch; isRecent: boolean }> = [];

    if (upcomingLaunches) {
      for (const l of upcomingLaunches) {
        allLaunches.push({ launch: l, isRecent: false });
      }
    }

    if (showRecentLaunches && recentLaunches) {
      for (const l of recentLaunches) {
        allLaunches.push({ launch: l, isRecent: true });
      }
    }

    if (allLaunches.length === 0) return;

    // Store flat list for click handler
    launchesRef.current = allLaunches.map((e) => e.launch);

    const billboards = new BillboardCollection();
    const labels = new LabelCollection();

    for (let i = 0; i < allLaunches.length; i++) {
      const { launch, isRecent } = allLaunches[i];
      const { latitude, longitude } = launch.launchSite;

      // Skip launches without valid coordinates
      if (latitude === 0 && longitude === 0) continue;

      const position = Cartesian3.fromDegrees(longitude, latitude, 0);
      const color = getStatusColor(launch.status, isRecent ? 0.5 : 1.0);
      const size = isRecent ? PIN_SIZE_RECENT : PIN_SIZE;

      // Add pin billboard
      billboards.add({
        position,
        pixelSize: size,
        color,
        id: i,
        scaleByDistance: new NearFarScalar(1e5, 1.5, 1e7, 0.6),
        distanceDisplayCondition: new DistanceDisplayCondition(0, 3e7),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      // Build label: "Falcon 9 · Starlink Group 12-3"
      const labelText = launch.payload
        ? `${launch.rocketType} · ${launch.payload.name}`
        : `${launch.rocketType} · ${launch.name}`;

      labels.add({
        position,
        text: labelText,
        font: '12px monospace',
        fillColor: Color.WHITE,
        outlineColor: Color.BLACK,
        outlineWidth: 2,
        style: LabelStyle.FILL_AND_OUTLINE,
        verticalOrigin: VerticalOrigin.BOTTOM,
        horizontalOrigin: HorizontalOrigin.LEFT,
        pixelOffset: new Cartesian2(10, -5),
        scaleByDistance: new NearFarScalar(1e5, 1.0, 5e6, 0.0),
        distanceDisplayCondition: new DistanceDisplayCondition(0, 5e6),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        showBackground: true,
        backgroundColor: new Color(0.04, 0.04, 0.16, 0.8), // #0a0a2a semi-transparent
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
    }

    viewer.scene.primitives.add(billboards);
    viewer.scene.primitives.add(labels);
    billboardCollectionRef.current = billboards;
    labelCollectionRef.current = labels;

    viewer.scene.requestRender();
  }, [viewer, isVisible, upcomingLaunches, recentLaunches, showRecentLaunches]);

  // Re-render when data or visibility changes
  useEffect(() => {
    renderPins();

    return (): void => {
      if (viewer && !viewer.isDestroyed()) {
        if (billboardCollectionRef.current) {
          viewer.scene.primitives.remove(billboardCollectionRef.current);
          billboardCollectionRef.current = null;
        }
        if (labelCollectionRef.current) {
          viewer.scene.primitives.remove(labelCollectionRef.current);
          labelCollectionRef.current = null;
        }
      }
    };
  }, [renderPins, viewer]);

  /**
   * Handle launch pin click via Cesium pick.
   */
  useEffect(() => {
    if (!viewer || viewer.isDestroyed()) return;

    const handler = new ScreenSpaceEventHandler(viewer.scene.canvas);

    handler.setInputAction(
      (movement: { position: Cartesian2 }) => {
        const picked = viewer.scene.pick(movement.position);
        if (
          defined(picked) &&
          picked.primitive instanceof BillboardCollection &&
          picked.primitive === billboardCollectionRef.current
        ) {
          const idx = picked.id;
          if (typeof idx === 'number' && launchesRef.current[idx]) {
            const launch = launchesRef.current[idx];

            const globeEntity: GlobeEntity = {
              id: launch.id,
              name: launch.name,
              type: 'launch',
              position: {
                latitude: launch.launchSite.latitude,
                longitude: launch.launchSite.longitude,
                altitude: 0,
              },
              properties: {
                provider: PROVIDER_LABELS[launch.provider],
                rocket: launch.rocketType,
                status: launch.status,
                scheduledTime: launch.scheduledTime.toISOString(),
                missionDescription: launch.missionDescription,
                payload: launch.payload?.name,
              },
            };

            // Clear tracked entity
            viewer.trackedEntity = undefined;

            useGlobeStore.getState().setSelectedGlobeEntity(globeEntity);
            useLaunchStore.getState().setSelectedLaunch(launch.id);

            // Fly to launch site
            viewer.camera.flyTo({
              destination: Cartesian3.fromDegrees(
                launch.launchSite.longitude,
                launch.launchSite.latitude,
                2000000, // 2000km altitude view
              ),
              duration: 1.5,
            });
          }
        }
      },
      ScreenSpaceEventType.LEFT_CLICK,
    );

    return (): void => {
      if (!handler.isDestroyed()) {
        handler.destroy();
      }
    };
  }, [viewer]);

  // Status overlay
  const upcomingCount = upcomingLaunches?.length ?? 0;
  const recentCount = showRecentLaunches ? (recentLaunches?.length ?? 0) : 0;

  return (
    <div className="absolute bottom-4 left-48 text-xs text-gray-400 pointer-events-none z-10">
      {upcomingCount > 0 && (
        <div>
          Launches: {upcomingCount} upcoming
          {recentCount > 0 && ` + ${recentCount} recent`}
        </div>
      )}
    </div>
  );
}
