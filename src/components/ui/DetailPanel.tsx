/**
 * Right detail panel for displaying entity information.
 *
 * Reads the selectedGlobeEntity from GlobeStore (set by entity click in
 * GlobeContainer) and renders its name, type, position, and properties.
 * The panel opens/closes via the root store's detailPanelOpen flag.
 */

'use client';

import React from 'react';
import { X, MapPin, Tag, Info } from 'lucide-react';
import { useStore } from '@/lib/store';
import { useGlobeStore } from '@/features/globe/store';

export function DetailPanel(): React.ReactElement | null {
  const detailPanelOpen = useStore((s) => s.detailPanelOpen);
  const setDetailPanelOpen = useStore((s) => s.setDetailPanelOpen);
  const setSelectedEntity = useStore((s) => s.setSelectedEntity);

  const entity = useGlobeStore((s) => s.selectedGlobeEntity);
  const setSelectedGlobeEntity = useGlobeStore((s) => s.setSelectedGlobeEntity);

  const handleClose = React.useCallback(() => {
    setDetailPanelOpen(false);
    setSelectedEntity(null);
    setSelectedGlobeEntity(null);
  }, [setDetailPanelOpen, setSelectedEntity, setSelectedGlobeEntity]);

  if (!detailPanelOpen || !entity) {
    return null;
  }

  const { latitude, longitude, altitude } = entity.position;

  return (
    <div className="fixed right-0 top-0 h-screen w-80 bg-space-dark/80 backdrop-blur-md border-l border-space-accent/20 z-40 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-space-accent/20">
        <h2 className="text-lg font-semibold truncate">{entity.name}</h2>
        <button
          onClick={handleClose}
          className="hover:bg-space-accent/10 p-2 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Type badge */}
        <div className="flex items-center gap-2 text-sm">
          <Tag className="w-4 h-4 text-space-accent" />
          <span className="uppercase tracking-wider text-space-accent/80">
            {entity.type}
          </span>
        </div>

        {/* Position */}
        <div>
          <h3 className="text-xs uppercase tracking-wider text-space-accent/60 mb-2 flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            Position
          </h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-gray-400">Lat:</span>{' '}
              <span className="text-space-accent font-mono">
                {latitude.toFixed(4)}°
              </span>
            </div>
            <div>
              <span className="text-gray-400">Lon:</span>{' '}
              <span className="text-space-accent font-mono">
                {longitude.toFixed(4)}°
              </span>
            </div>
            {altitude !== undefined && altitude > 0 && (
              <div className="col-span-2">
                <span className="text-gray-400">Alt:</span>{' '}
                <span className="text-space-accent font-mono">
                  {(altitude / 1000).toFixed(1)} km
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Properties */}
        {entity.properties && Object.keys(entity.properties).length > 0 && (
          <div>
            <h3 className="text-xs uppercase tracking-wider text-space-accent/60 mb-2 flex items-center gap-1">
              <Info className="w-3 h-3" />
              Properties
            </h3>
            <div className="space-y-1.5 text-xs">
              {Object.entries(entity.properties).map(([key, value]) => (
                <div key={key} className="flex justify-between gap-2">
                  <span className="text-gray-400 truncate">{key}</span>
                  <span className="text-space-accent text-right truncate max-w-[55%]">
                    {String(value ?? '—')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
