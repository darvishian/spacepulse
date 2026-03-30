/**
 * CZML data source component for loading dynamic entities.
 *
 * Loads CZML from a URL or inline data object and adds it to the
 * Cesium viewer via the GlobeStore viewer ref. Supports streaming
 * updates by re-processing when czmlData changes.
 */

'use client';

import React, { useEffect, useRef } from 'react';
import {
  CzmlDataSource as CesiumCzmlDataSource,
} from 'cesium';

import { useGlobeStore } from './store';

interface CzmlDataSourceProps {
  /** URL to fetch CZML from */
  url?: string;
  /** Inline CZML data (array of CZML packets) */
  czmlData?: unknown[];
  /** Unique name for this data source */
  name?: string;
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Manages a CzmlDataSource on the viewer. Does not render any DOM —
 * it only manages data loading side-effects.
 */
export function CzmlDataSource({
  url,
  czmlData,
  name = 'czml-source',
  onLoad,
  onError,
}: CzmlDataSourceProps): React.ReactElement | null {
  const viewerRef = useGlobeStore((s) => s.viewerRef);
  const dataSourceRef = useRef<CesiumCzmlDataSource | null>(null);

  useEffect(() => {
    if (!viewerRef || viewerRef.isDestroyed()) return;

    const loadCzml = async (): Promise<void> => {
      try {
        // Remove previous data source if it exists
        if (dataSourceRef.current) {
          viewerRef.dataSources.remove(dataSourceRef.current, true);
          dataSourceRef.current = null;
        }

        const ds = new CesiumCzmlDataSource(name);

        if (url) {
          await ds.load(url);
        } else if (czmlData && Array.isArray(czmlData)) {
          await ds.load(czmlData);
        } else {
          return; // nothing to load
        }

        await viewerRef.dataSources.add(ds);
        dataSourceRef.current = ds;
        viewerRef.scene.requestRender();
        onLoad?.();
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        console.error('[CzmlDataSource] Load failed:', error);
        onError?.(error);
      }
    };

    loadCzml();

    return () => {
      // Cleanup on unmount
      if (dataSourceRef.current && viewerRef && !viewerRef.isDestroyed()) {
        viewerRef.dataSources.remove(dataSourceRef.current, true);
        dataSourceRef.current = null;
      }
    };
    // Re-run when the source data changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewerRef, url, czmlData, name]);

  return null;
}
