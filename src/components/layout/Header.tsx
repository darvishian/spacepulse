/**
 * Top header/navigation bar component
 * TODO: Implement header with logo, status indicators, and quick actions
 */

'use client';

import React from 'react';
import { Activity, Settings, Bell } from 'lucide-react';
import { SearchBar } from '@/components/ui/SearchBar';
import { useStore } from '@/lib/store';

/**
 * TODO: Implement header with real-time status
 */
export function Header() {
  const toggleDebugMode = useStore((state) => state.toggleDebugMode);
  const [isConnected] = React.useState(true);

  // TODO: Connect to WebSocket status
  // TODO: Monitor API health

  return (
    <header className="fixed top-0 left-20 right-0 h-16 bg-space-dark/50 backdrop-blur-md border-b border-space-accent/20 px-6 flex items-center justify-between z-30">
      {/* Logo and status */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-space-accent" />
          <span className="text-sm font-semibold hidden sm:inline">
            SpacePulse Dashboard
          </span>
        </div>

        {/* Connection status */}
        <div className="flex items-center gap-2 text-xs">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-space-success' : 'bg-space-warning'}`} />
          <span className={isConnected ? 'text-space-success' : 'text-space-warning'}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Center search */}
      <SearchBar />

      {/* Right actions */}
      <div className="flex items-center gap-3">
        <button className="hover:bg-space-accent/10 p-2 rounded-lg transition-colors relative">
          <Bell className="w-5 h-5" />
          {/* TODO: Show notification badge */}
        </button>

        <button
          onClick={toggleDebugMode}
          className="hover:bg-space-accent/10 p-2 rounded-lg transition-colors text-xs"
          title="Toggle debug mode"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}
