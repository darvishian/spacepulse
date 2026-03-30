import { Server as SocketIOServer } from 'socket.io';
import launchesService from '../services/launches.service';
import { Launch } from '../types/launch';

/**
 * Launches polling job
 * Polls launch APIs at regular intervals and emits updates via WebSocket.
 * Uses granular change detection: only broadcasts when launches are
 * created, updated, or removed — not on every poll cycle.
 */

let previousLaunches: Launch[] = [];

/**
 * Poll launches and emit granular update events.
 */
export async function pollLaunches(io?: SocketIOServer): Promise<void> {
  try {
    const launches = await launchesService.fetchUpcomingLaunches();

    if (previousLaunches.length === 0) {
      // First poll — seed state, broadcast full snapshot
      previousLaunches = launches;
      if (io) {
        io.of('/launches').emit('launches_update', {
          status: 'success',
          data: launches,
          timestamp: new Date().toISOString(),
        });
      }
      console.log(`[Poll Launches] Initial load: ${launches.length} launches`);
      return;
    }

    // Granular change detection
    const changes = detectLaunchChanges(launches, previousLaunches);
    const hasChanges =
      changes.created.length > 0 ||
      changes.updated.length > 0 ||
      changes.removed.length > 0;

    if (hasChanges && io) {
      // Emit granular events for each change type
      emitLaunchEvents(io, changes);

      // Also emit full snapshot for clients that prefer it
      io.of('/launches').emit('launches_update', {
        status: 'success',
        data: launches,
        timestamp: new Date().toISOString(),
      });

      console.log(
        `[Poll Launches] Changes: +${changes.created.length} created, ` +
        `~${changes.updated.length} updated, -${changes.removed.length} removed`,
      );
    }

    previousLaunches = launches;
  } catch (error) {
    console.error('[Poll Launches] Error polling launches:', error instanceof Error ? error.message : error);
  }
}

/**
 * Detect which launches changed between polls.
 * Compares by launch ID, uses JSON equality for update detection.
 */
export function detectLaunchChanges(
  newLaunches: Launch[],
  oldLaunches: Launch[],
): { created: Launch[]; updated: Launch[]; removed: Launch[] } {
  const oldMap = new Map(oldLaunches.map((l) => [l.id, l]));
  const newMap = new Map(newLaunches.map((l) => [l.id, l]));

  const created = newLaunches.filter((n) => !oldMap.has(n.id));
  const removed = oldLaunches.filter((o) => !newMap.has(o.id));
  const updated = newLaunches.filter((n) => {
    const old = oldMap.get(n.id);
    return old && JSON.stringify(old) !== JSON.stringify(n);
  });

  return { created, updated, removed };
}

/**
 * Emit specific launch events to the /launches namespace.
 */
export function emitLaunchEvents(
  io: SocketIOServer,
  changes: { created: Launch[]; updated: Launch[]; removed: Launch[] },
): void {
  const { created, updated, removed } = changes;
  const ts = new Date().toISOString();

  if (created.length > 0) {
    io.of('/launches').emit('launches_created', { data: created, timestamp: ts });
  }

  if (updated.length > 0) {
    io.of('/launches').emit('launches_updated', { data: updated, timestamp: ts });
  }

  if (removed.length > 0) {
    io.of('/launches').emit('launches_removed', { data: removed, timestamp: ts });
  }
}

export default pollLaunches;
