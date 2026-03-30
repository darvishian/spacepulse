/**
 * Globe controls overlay — layer visibility toggles with opacity sliders.
 *
 * Reads layer state from GlobeStore and dispatches toggle/opacity updates.
 */

'use client';

import React, { useCallback } from 'react';
import { Eye, EyeOff, Layers, ChevronDown, ChevronUp } from 'lucide-react';
import { useGlobeStore } from './store';
import type { LayerConfig } from './types';

interface GlobeControlsProps {
  onLayerToggle?: (layerId: string, visible: boolean) => void;
}

export function GlobeControls({ onLayerToggle }: GlobeControlsProps): React.ReactElement {
  const layers = useGlobeStore((s) => s.layers);
  const setLayerVisible = useGlobeStore((s) => s.setLayerVisible);
  const setLayerOpacity = useGlobeStore((s) => s.setLayerOpacity);
  const [collapsed, setCollapsed] = React.useState(false);

  const handleToggle = useCallback(
    (layer: LayerConfig) => {
      const newVisible = !layer.visible;
      setLayerVisible(layer.id, newVisible);
      onLayerToggle?.(layer.id, newVisible);
    },
    [setLayerVisible, onLayerToggle]
  );

  const handleOpacity = useCallback(
    (layerId: string, value: number) => {
      setLayerOpacity(layerId, value);
    },
    [setLayerOpacity]
  );

  return (
    <div className="absolute top-20 left-4 z-20 glass rounded-lg p-3 max-w-xs select-none">
      {/* Header */}
      <button
        onClick={() => setCollapsed((p) => !p)}
        className="w-full flex items-center justify-between text-sm font-semibold text-space-accent mb-1"
      >
        <span className="flex items-center gap-1.5">
          <Layers className="w-4 h-4" />
          Layers
        </span>
        {collapsed ? (
          <ChevronDown className="w-4 h-4" />
        ) : (
          <ChevronUp className="w-4 h-4" />
        )}
      </button>

      {!collapsed && (
        <div className="space-y-1 mt-2">
          {layers.map((layer) => (
            <div key={layer.id} className="space-y-1">
              {/* Toggle row */}
              <button
                onClick={() => handleToggle(layer)}
                className="w-full flex items-center justify-between p-2 hover:bg-space-accent/10 rounded transition-colors text-sm"
              >
                <span className="capitalize">
                  {layer.name}
                </span>
                {layer.visible ? (
                  <Eye className="w-4 h-4 text-space-success" />
                ) : (
                  <EyeOff className="w-4 h-4 text-gray-500" />
                )}
              </button>

              {/* Opacity slider (only when layer is visible) */}
              {layer.visible && (
                <div className="px-2 pb-1">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={layer.opacity}
                    onChange={(e) =>
                      handleOpacity(layer.id, parseFloat(e.target.value))
                    }
                    className="w-full h-1 bg-space-accent/20 rounded-lg appearance-none cursor-pointer accent-space-accent"
                    title={`Opacity: ${Math.round(layer.opacity * 100)}%`}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
