/**
 * SGP4 TLE propagation hooks using satellite.js.
 *
 * - useTlePropagator: single-shot propagation for one TLE record
 * - useBatchPropagator: bulk propagation for thousands of TLEs (used by SatelliteLayer)
 * - useContinuousPropagation: timer-driven continuous updates
 */

'use client';

import { useEffect, useCallback, useRef, useMemo } from 'react';
import * as satellite from 'satellite.js';
import { SatellitePosition, TleRecord } from '../types';

/** Radians-to-degrees conversion factor. */
const RAD2DEG = 180 / Math.PI;

/** Earth radius in km. */
const EARTH_RADIUS_KM = 6371;

/**
 * Propagate a single TLE to a given date and return a SatellitePosition.
 * Pure function — no React hooks. Can be called from workers or loops.
 */
export function propagateTle(tle: TleRecord, date: Date): SatellitePosition | null {
  try {
    const satrec = satellite.twoline2satrec(tle.line1, tle.line2);

    const positionAndVelocity = satellite.propagate(satrec, date);
    const positionEci = positionAndVelocity.position;
    const velocityEci = positionAndVelocity.velocity;

    // propagate returns false on error
    if (
      typeof positionEci === 'boolean' ||
      !positionEci ||
      typeof velocityEci === 'boolean' ||
      !velocityEci
    ) {
      return null;
    }

    // Convert ECI to geodetic (lat/lon/alt)
    const gmst = satellite.gstime(date);
    const geodetic = satellite.eciToGeodetic(positionEci, gmst);

    const latitude = geodetic.latitude * RAD2DEG;
    const longitude = geodetic.longitude * RAD2DEG;
    const altitude = geodetic.height; // km above ellipsoid

    // Calculate velocity magnitude in km/s
    const vx = velocityEci.x;
    const vy = velocityEci.y;
    const vz = velocityEci.z;
    const velocity = Math.sqrt(vx * vx + vy * vy + vz * vz);

    // Calculate heading (direction of travel projected onto ground)
    // Using the velocity vector in ECI rotated to ECEF
    const heading = Math.atan2(vy, vx) * RAD2DEG;

    // Ground footprint radius (approximate — visible horizon from altitude)
    const footprint = altitude > 0
      ? EARTH_RADIUS_KM * Math.acos(EARTH_RADIUS_KM / (EARTH_RADIUS_KM + altitude))
      : 0;

    return {
      id: tle.id,
      name: tle.name,
      latitude,
      longitude,
      altitude,
      velocity,
      heading: ((heading % 360) + 360) % 360,
      footprint,
    };
  } catch {
    // SGP4 can throw for stale or malformed TLEs
    return null;
  }
}

/**
 * Propagate an array of TLEs to a given date.
 * Designed for bulk processing of 20k+ records.
 * Skips failed propagations silently.
 */
export function propagateBatch(tles: TleRecord[], date: Date): SatellitePosition[] {
  const results: SatellitePosition[] = [];
  for (let i = 0; i < tles.length; i++) {
    const pos = propagateTle(tles[i], date);
    if (pos) {
      results.push(pos);
    }
  }
  return results;
}

/**
 * Hook: propagate a single TLE on demand.
 * Returns a stable `propagate(date)` callback and the latest position.
 */
export function useTlePropagator(
  tle: TleRecord,
  onPositionUpdate?: (position: SatellitePosition) => void,
): { propagate: (date: Date) => SatellitePosition | null } {
  const propagate = useCallback(
    (date: Date): SatellitePosition | null => {
      const position = propagateTle(tle, date);
      if (position && onPositionUpdate) {
        onPositionUpdate(position);
      }
      return position;
    },
    [tle, onPositionUpdate],
  );

  return { propagate };
}

/**
 * Hook: continuous propagation on a timer for a single TLE.
 * Updates at the given interval (default 1000ms).
 */
export function useContinuousPropagation(
  tle: TleRecord | null,
  updateInterval: number = 1000,
): SatellitePosition | null {
  const positionRef = useRef<SatellitePosition | null>(null);

  // Pre-compute satrec so we don't re-parse TLE every tick
  const satrec = useMemo(() => {
    if (!tle) return null;
    try {
      return satellite.twoline2satrec(tle.line1, tle.line2);
    } catch {
      return null;
    }
  }, [tle]);

  useEffect(() => {
    if (!satrec || !tle || updateInterval <= 0) return;

    const tick = (): void => {
      try {
        const now = new Date();
        const positionAndVelocity = satellite.propagate(satrec, now);
        const positionEci = positionAndVelocity.position;
        const velocityEci = positionAndVelocity.velocity;

        if (typeof positionEci === 'boolean' || !positionEci || typeof velocityEci === 'boolean' || !velocityEci) {
          return;
        }

        const gmst = satellite.gstime(now);
        const geo = satellite.eciToGeodetic(positionEci, gmst);

        const vx = velocityEci.x;
        const vy = velocityEci.y;
        const vz = velocityEci.z;

        positionRef.current = {
          id: tle.id,
          name: tle.name,
          latitude: geo.latitude * RAD2DEG,
          longitude: geo.longitude * RAD2DEG,
          altitude: geo.height,
          velocity: Math.sqrt(vx * vx + vy * vy + vz * vz),
        };
      } catch {
        // skip
      }
    };

    tick(); // Immediate first tick
    const interval = setInterval(tick, updateInterval);
    return () => clearInterval(interval);
  }, [satrec, tle, updateInterval]);

  return positionRef.current;
}
