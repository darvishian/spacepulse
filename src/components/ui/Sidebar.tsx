/**
 * Left sidebar component with filter/layer toggles and navigation
 * TODO: Implement sidebar with feature toggles, layer management, and search
 */

'use client';

import React from 'react';
import { Menu, X, Settings } from 'lucide-react';
import { useStore } from '@/lib/store';
import { pluginRegistry } from '@/lib/plugins/registry';

/**
 * TODO: Implement sidebar feature list and toggles
 */
export function Sidebar() {
  const sidebarOpen = useStore((state) => state.sidebarOpen);
  const setSidebarOpen = useStore((state) => state.setSidebarOpen);
  const [layersOpen, setLayersOpen] = React.useState(true);

  const plugins = pluginRegistry.getEnabled();

  return (
    <div
      className={`fixed left-0 top-0 h-screen bg-space-dark/80 backdrop-blur-md border-r border-space-accent/20 transition-all duration-300 z-40 ${
        sidebarOpen ? 'w-64' : 'w-20'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-space-accent/20">
        {sidebarOpen && (
          <h1 className="text-lg font-bold text-space-accent">SpacePulse</h1>
        )}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="hover:bg-space-accent/10 p-2 rounded-lg transition-colors"
        >
          {sidebarOpen ? (
            <X className="w-5 h-5" />
          ) : (
            <Menu className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="p-4 space-y-2">
        {sidebarOpen && (
          <>
            {/* TODO: Implement layer toggles */}
            <div className="mb-6">
              <h3 className="text-xs uppercase tracking-wider text-space-accent/60 font-semibold mb-3">
                Layers
              </h3>
              <div className="space-y-2">
                {/* TODO: Add layer items with checkboxes */}
                <div className="flex items-center gap-2 p-2 rounded hover:bg-space-accent/10 cursor-pointer">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Satellites</span>
                </div>
              </div>
            </div>

            {/* TODO: Implement plugin navigation */}
            {plugins.length > 0 && (
              <div>
                <h3 className="text-xs uppercase tracking-wider text-space-accent/60 font-semibold mb-3">
                  Features
                </h3>
                <div className="space-y-1">
                  {plugins.map((plugin) => {
                    const Icon = plugin.sidebarIcon;
                    return (
                      <button
                        key={plugin.id}
                        className="w-full flex items-center gap-2 p-2 rounded hover:bg-space-accent/10 transition-colors text-sm"
                      >
                        {Icon && <Icon className="w-4 h-4" />}
                        {plugin.sidebarLabel || plugin.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TODO: Implement search */}
            <div className="mt-6 p-3 bg-space-accent/5 rounded-lg border border-space-accent/20">
              <input
                type="text"
                placeholder="Search..."
                className="w-full bg-transparent text-sm outline-none placeholder-gray-500"
              />
            </div>
          </>
        )}

        {/* Settings */}
        {!sidebarOpen && (
          <div className="flex justify-center py-2">
            <Settings className="w-5 h-5 text-space-accent/60" />
          </div>
        )}
      </nav>
    </div>
  );
}
