/**
 * Custom hook for accessing and managing the Cesium viewer instance.
 *
 * Rather than creating its own viewer, this hook reads the viewer ref
 * that GlobeContainer stores in the GlobeStore, and exposes a stable
 * API for other features (satellites, launches, etc.) to add/remove
 * entities and control the camera.
 */

'use client';

import { useCallback, useMemo } from 'react';
import {
  Cartesian3,
  Color,
  Entity as CesiumEntity,
  Math as CesiumMath,
  VerticalOrigin,
  HorizontalOrigin,
  NearFarScalar,
} from 'cesium';

import { useGlobeStore } from '../store';
import type { GlobeEntity, GlobeViewerInstance, CameraState } from '../types';

/**
 * Provides a stable API for interacting with the Cesium viewer.
 * Safe to call even when the viewer is not yet mounted — operations
 * become no-ops until the viewer ref is available.
 */
export function useGlobeViewer(): GlobeViewerInstance {
  const viewerRef = useGlobeStore((s) => s.viewerRef);

  const addEntity = useCallback(
    (entity: GlobeEntity): CesiumEntity | null => {
      if (!viewerRef || viewerRef.isDestroyed()) return null;

      const position = Cartesian3.fromDegrees(
        entity.position.longitude,
        entity.position.latitude,
        entity.position.altitude ?? 0
      );

      const cesiumEntity = viewerRef.entities.add({
        id: entity.id,
        name: entity.name,
        position,
        point: {
          pixelSize: 6,
          color: Color.CYAN,
          outlineColor: Color.WHITE,
          outlineWidth: 1,
          scaleByDistance: new NearFarScalar(1.5e2, 2.0, 1.5e7, 0.5),
        },
        label: {
          text: entity.name,
          font: '12px Inter, sans-serif',
          fillColor: Color.WHITE,
          outlineColor: Color.BLACK,
          outlineWidth: 2,
          style: 2, // FILL_AND_OUTLINE
          verticalOrigin: VerticalOrigin.BOTTOM,
          horizontalOrigin: HorizontalOrigin.LEFT,
          pixelOffset: { x: 8, y: -4 } as any,
          scaleByDistance: new NearFarScalar(1.5e2, 1.0, 1.5e7, 0.0),
          showBackground: true,
          backgroundColor: Color.fromCssColorString('#0a0a2a').withAlpha(0.7),
        },
        properties: entity.properties as any,
      });

      // Request re-render
      viewerRef.scene.requestRender();
      return cesiumEntity;
    },
    [viewerRef]
  );

  const removeEntity = useCallback(
    (entityId: string): void => {
      if (!viewerRef || viewerRef.isDestroyed()) return;
      const entity = viewerRef.entities.getById(entityId);
      if (entity) {
        viewerRef.entities.remove(entity);
        viewerRef.scene.requestRender();
      }
    },
    [viewerRef]
  );

  const removeAllEntities = useCallback((): void => {
    if (!viewerRef || viewerRef.isDestroyed()) return;
    viewerRef.entities.removeAll();
    viewerRef.scene.requestRender();
  }, [viewerRef]);

  const setCameraView = useCallback(
    (view: CameraState): void => {
      if (!viewerRef || viewerRef.isDestroyed()) return;
      viewerRef.camera.flyTo({
        destination: Cartesian3.fromDegrees(
          view.longitude,
          view.latitude,
          view.altitude
        ),
        orientation: {
          heading: CesiumMath.toRadians(view.heading ?? 0),
          pitch: CesiumMath.toRadians(view.pitch ?? -90),
          roll: CesiumMath.toRadians(view.roll ?? 0),
        },
        duration: 1.5,
      });
    },
    [viewerRef]
  );

  const flyTo = useCallback(
    (entityId: string): void => {
      if (!viewerRef || viewerRef.isDestroyed()) return;
      const entity = viewerRef.entities.getById(entityId);
      if (entity) {
        viewerRef.flyTo(entity, { duration: 1.5 });
      }
    },
    [viewerRef]
  );

  return useMemo<GlobeViewerInstance>(
    () => ({
      viewer: viewerRef,
      clock: viewerRef?.clock ?? null,
      addEntity,
      removeEntity,
      removeAllEntities,
      setCameraView,
      flyTo,
    }),
    [viewerRef, addEntity, removeEntity, removeAllEntities, setCameraView, flyTo]
  );
}
