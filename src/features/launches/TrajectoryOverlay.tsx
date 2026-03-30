/**
 * TrajectoryOverlay — renders approximate launch trajectories on the Cesium globe.
 *
 * Since free APIs don't provide trajectory data, we generate synthetic arcs
 * from the launch site toward the target orbit using great-circle interpolation.
 *
 * - Upcoming launches: solid colored polylines
 * - Recent launches: dotted/faded polylines
 * - Altitude ramps up from 0 to ~400km (LEO) over the arc
 */

'use client';

import React, { useCallback, useEffect, useRef } from 'react';
import {
  Cartesian3,
  Color,
  PolylineCollection,
  Material,
  DistanceDisplayCondition,
} from 'cesium';

import { useGlobeStore } from '../globe/store';
import { LayerType } from '../globe/types';
import { useLaunchStore } from './store';
import { Launch, STATUS_COLORS } from './types';

/** Number of interpolation points along each trajectory arc. */
const ARC_SEGMENTS = 40;

/** Default orbit altitude in meters (LEO ~400km). */
const DEFAULT_ORBIT_ALT = 400_000;

/** Arc length in degrees of longitude from launch site. */
const ARC_LENGTH_DEG = 25;

/**
 * Orbit destination string → altitude in meters.
 */
function orbitToAltitude(orbit?: string): number {
  if (!orbit) return DEFAULT_ORBIT_ALT;
  const upper = orbit.toUpperCase();
  if (upper === 'LEO' || upper === 'SSO') return 400_000;
  if (upper === 'MEO') return 20_200_000;
  if (upper === 'GEO' || upper === 'GTO') return 35_786_000;
  if (upper === 'HEO') return 40_000_000;
  return DEFAULT_ORBIT_ALT;
}

/**
 * Generate an approximate trajectory arc from a launch site.
 * Uses great-circle interpolation heading roughly east (for equatorial)
 * or along inclination for polar orbits.
 */
function generateArcPositions(launch: Launch): Cartesian3[] {
  const { latitude, longitude } = launch.launchSite;

  // Determine if orbit is polar (SSO, LEO with high-lat site)
  const isPolar =
    launch.payload?.destination?.toUpperCase() === 'SSO' ||
    Math.abs(latitude) > 50;

  const targetAlt = Math.min(orbitToAltitude(launch.payload?.destination), 2_000_000);

  const positions: Cartesian3[] = [];

  for (let i = 0; i <= ARC_SEGMENTS; i++) {
    const t = i / ARC_SEGMENTS;

    // Altitude ramps from 0 → targetAlt with a slight S-curve
    const altFraction = Math.sin((t * Math.PI) / 2); // ease-in
    const alt = altFraction * targetAlt;

    // Latitude/longitude progression
    let lat: number;
    let lon: number;

    if (isPolar) {
      // Polar: head roughly south/north
      const direction = latitude > 0 ? -1 : 1;
      lat = latitude + direction * t * ARC_LENGTH_DEG;
      lon = longitude + t * ARC_LENGTH_DEG * 0.3; // slight eastward drift
    } else {
      // Equatorial-ish: head east
      lat = latitude + Math.sin(t * Math.PI) * 3; // slight latitude wobble
      lon = longitude + t * ARC_LENGTH_DEG;
    }

    // Clamp
    lat = Math.max(-85, Math.min(85, lat));

    positions.push(Cartesian3.fromDegrees(lon, lat, alt));
  }

  return positions;
}

export function TrajectoryOverlay(): React.ReactElement | null {
  const viewer = useGlobeStore((s) => s.viewerRef);
  const layers = useGlobeStore((s) => s.layers);
  const showTrajectories = useLaunchStore((s) => s.showTrajectories);
  const showRecentLaunches = useLaunchStore((s) => s.showRecentLaunches);
  const launches = useLaunchStore((s) => s.launches);
  const recentLaunches = useLaunchStore((s) => s.recentLaunches);
  const selectedLaunchId = useLaunchStore((s) => s.selectedLaunchId);

  const polylineCollectionRef = useRef<PolylineCollection | null>(null);

  const launchLayer = layers.find((l) => l.type === LayerType.LAUNCHES);
  const isVisible = (launchLayer?.visible ?? true) && showTrajectories;

  const renderTrajectories = useCallback((): void => {
    if (!viewer || viewer.isDestroyed()) return;

    // Remove old collection
    if (polylineCollectionRef.current) {
      viewer.scene.primitives.remove(polylineCollectionRef.current);
      polylineCollectionRef.current = null;
    }

    if (!isVisible) return;

    // Decide which launches get trajectories
    const trajectoryLaunches: Array<{ launch: Launch; isRecent: boolean }> = [];

    // If a launch is selected, show only its trajectory
    if (selectedLaunchId) {
      const selected =
        launches.find((l) => l.id === selectedLaunchId) ||
        recentLaunches.find((l) => l.id === selectedLaunchId);
      if (selected) {
        const isRecent = selected.scheduledTime.getTime() < Date.now();
        trajectoryLaunches.push({ launch: selected, isRecent });
      }
    } else {
      // Show all upcoming trajectories
      for (const l of launches) {
        if (l.launchSite.latitude !== 0 || l.launchSite.longitude !== 0) {
          trajectoryLaunches.push({ launch: l, isRecent: false });
        }
      }
      // Show recent if toggled
      if (showRecentLaunches) {
        for (const l of recentLaunches) {
          if (l.launchSite.latitude !== 0 || l.launchSite.longitude !== 0) {
            trajectoryLaunches.push({ launch: l, isRecent: true });
          }
        }
      }
    }

    if (trajectoryLaunches.length === 0) return;

    const polylines = new PolylineCollection();

    for (const { launch, isRecent } of trajectoryLaunches) {
      const positions = generateArcPositions(launch);
      if (positions.length < 2) continue;

      const hex = STATUS_COLORS[launch.status] ?? '#888888';
      const color = Color.fromCssColorString(hex);
      const alpha = isRecent ? 0.3 : 0.7;

      // Use dashed material for recent launches, solid for upcoming
      const material = isRecent
        ? Material.fromType('PolylineDash', {
            color: new Color(color.red, color.green, color.blue, alpha),
            dashLength: 16,
            dashPattern: 255,
          })
        : Material.fromType('Color', {
            color: new Color(color.red, color.green, color.blue, alpha),
          });

      polylines.add({
        positions,
        width: isRecent ? 1.5 : 2.5,
        material,
        distanceDisplayCondition: new DistanceDisplayCondition(0, 2e7),
      } as unknown as Record<string, unknown>);
    }

    viewer.scene.primitives.add(polylines);
    polylineCollectionRef.current = polylines;
    viewer.scene.requestRender();
  }, [
    viewer,
    isVisible,
    launches,
    recentLaunches,
    showRecentLaunches,
    selectedLaunchId,
  ]);

  useEffect(() => {
    renderTrajectories();

    return (): void => {
      if (viewer && !viewer.isDestroyed() && polylineCollectionRef.current) {
        viewer.scene.primitives.remove(polylineCollectionRef.current);
        polylineCollectionRef.current = null;
      }
    };
  }, [renderTrajectories, viewer]);

  return null; // Pure imperative rendering — no DOM output needed
}
