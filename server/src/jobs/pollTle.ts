import { Server as SocketIOServer } from 'socket.io';
import celestrakService from '../services/celestrak.service';
import { TleRecord } from '../types/satellite';

/**
 * TLE (Two-Line Element) polling job
 * Polls Celestrak at regular intervals (typically 30 minutes).
 * Uses granular change detection: emits events for new, updated, and decayed satellites.
 */

let previousTles: TleRecord[] = [];

/**
 * Poll TLE data and emit granular update events.
 */
export async function pollTle(io?: SocketIOServer): Promise<void> {
  try {
    const tles = await celestrakService.fetchTleData();

    if (previousTles.length === 0) {
      // First poll — seed state, broadcast full snapshot
      previousTles = tles;
      if (io) {
        io.of('/satellites').emit('tle_update', {
          status: 'success',
          data: tles,
          count: tles.length,
          timestamp: new Date().toISOString(),
        });
      }
      console.log(`[Poll TLE] Initial load: ${tles.length} TLE records`);
      return;
    }

    // Granular change detection
    const changes = detectTleChanges(tles, previousTles);
    const hasChanges =
      changes.newSatellites.length > 0 ||
      changes.updated.length > 0 ||
      changes.decayed.length > 0;

    if (hasChanges && io) {
      // Emit granular events
      emitTleEvents(io, changes);

      // Also emit full snapshot for clients that prefer it
      io.of('/satellites').emit('tle_update', {
        status: 'success',
        data: tles,
        count: tles.length,
        timestamp: new Date().toISOString(),
      });

      console.log(
        `[Poll TLE] Changes: +${changes.newSatellites.length} new, ` +
        `~${changes.updated.length} updated, -${changes.decayed.length} decayed`,
      );
    }

    previousTles = tles;
    console.log(`[Poll TLE] Fetched ${tles.length} TLE records`);
  } catch (error) {
    console.error('[Poll TLE] Error polling TLE data:', error instanceof Error ? error.message : error);
  }
}

/**
 * Poll constellation-specific TLEs and broadcast.
 */
export async function pollConstellationTles(
  constellationName: string,
  io?: SocketIOServer,
): Promise<void> {
  try {
    const tles = await celestrakService.fetchConstellationTles(constellationName);

    if (io) {
      io.of('/satellites').emit('constellation_tle_update', {
        constellation: constellationName,
        data: tles,
        count: tles.length,
        timestamp: new Date().toISOString(),
      });
    }

    console.log(`[Poll TLE] Fetched ${tles.length} TLEs for ${constellationName}`);
  } catch (error) {
    console.error(`[Poll TLE] Error polling constellation TLEs for ${constellationName}:`, error);
  }
}

/**
 * Detect which TLEs changed between polls.
 * Uses satelliteId for identity, JSON equality for update detection.
 */
export function detectTleChanges(
  newTles: TleRecord[],
  oldTles: TleRecord[],
): {
  newSatellites: TleRecord[];
  updated: TleRecord[];
  decayed: TleRecord[];
} {
  const oldMap = new Map(oldTles.map((t) => [t.satelliteId, t]));
  const newMap = new Map(newTles.map((t) => [t.satelliteId, t]));

  const newSatellites = newTles.filter((n) => !oldMap.has(n.satelliteId));
  const decayed = oldTles.filter((o) => !newMap.has(o.satelliteId));
  const updated = newTles.filter((n) => {
    const old = oldMap.get(n.satelliteId);
    return old && JSON.stringify(old) !== JSON.stringify(n);
  });

  return { newSatellites, updated, decayed };
}

/**
 * Emit TLE change events to the /satellites namespace.
 */
export function emitTleEvents(
  io: SocketIOServer,
  changes: { newSatellites: TleRecord[]; updated: TleRecord[]; decayed: TleRecord[] },
): void {
  const { newSatellites, updated, decayed } = changes;
  const ts = new Date().toISOString();

  if (newSatellites.length > 0) {
    io.of('/satellites').emit('satellites_added', { data: newSatellites, count: newSatellites.length, timestamp: ts });
    console.log(`[Poll TLE] ${newSatellites.length} new satellites detected`);
  }

  if (updated.length > 0) {
    io.of('/satellites').emit('satellites_updated', { data: updated, count: updated.length, timestamp: ts });
    console.log(`[Poll TLE] ${updated.length} satellites updated`);
  }

  if (decayed.length > 0) {
    io.of('/satellites').emit('satellites_removed', { data: decayed, count: decayed.length, timestamp: ts });
    console.log(`[Poll TLE] ${decayed.length} satellites decayed/removed`);
  }
}

export default pollTle;
