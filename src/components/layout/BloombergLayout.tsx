/**
 * Bloomberg-style draggable/resizable panel layout.
 *
 * Uses react-grid-layout v2 to let users freely move and resize dashboard panels,
 * similar to a Bloomberg Terminal or trading desk layout.
 * Panels can be minimized, maximized, and rearranged via drag handles.
 *
 * Each panel has a title bar with controls and a content area.
 */

'use client';

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  ResponsiveGridLayout,
  useContainerWidth,
  verticalCompactor,
  getBreakpointFromWidth,
} from 'react-grid-layout';
import type {
  LayoutItem,
  Layout as RGLLayout,
  ResponsiveLayouts,
} from 'react-grid-layout';
import {
  Maximize2,
  Minimize2,
  X,
  GripHorizontal,
  RotateCcw,
} from 'lucide-react';

import 'react-grid-layout/css/styles.css';

/** Breakpoint → LayoutItem[] mapping (exported for consumers) */
export type Layouts = ResponsiveLayouts<string>;
export type { LayoutItem };

// ── Panel configuration ─────────────────────────────────────────────────

export interface PanelConfig {
  id: string;
  title: string;
  icon?: React.ReactNode;
  /** Minimum width in grid units (1 col ≈ ~1/12 of container) */
  minW?: number;
  minH?: number;
  /** Whether the panel can be closed */
  closable?: boolean;
  /** Render function for panel content */
  children: React.ReactNode;
}

interface BloombergLayoutProps {
  panels: PanelConfig[];
  /** Default layout specification per breakpoint */
  defaultLayouts: Layouts;
  /** Number of grid columns */
  cols?: Record<string, number>;
  /** Row height in pixels */
  rowHeight?: number;
  /** Called when a panel is closed */
  onPanelClose?: (panelId: string) => void;
  /** Called when a closed panel is reopened */
  onPanelRestore?: (panelId: string) => void;
}

// ── Bloomberg Panel Chrome ──────────────────────────────────────────────

interface PanelChromeProps {
  title: string;
  icon?: React.ReactNode;
  isMaximized: boolean;
  closable: boolean;
  onMaximize: () => void;
  onMinimize: () => void;
  onClose: () => void;
  children: React.ReactNode;
}

const PanelChrome = React.memo(function PanelChrome({
  title,
  icon,
  isMaximized,
  closable,
  onMaximize,
  onMinimize,
  onClose,
  children,
}: PanelChromeProps): React.ReactElement {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded border border-white/[0.06] bg-space-darker/80 backdrop-blur-sm shadow-lg shadow-black/30">
      {/* Title bar — acts as drag handle */}
      <div className="bloomberg-drag-handle flex shrink-0 cursor-grab items-center justify-between border-b border-white/[0.06] bg-white/[0.02] px-3 py-1.5 active:cursor-grabbing">
        <div className="flex items-center gap-2">
          <GripHorizontal className="h-3 w-3 text-white/20" />
          {icon && <span className="text-space-accent/70">{icon}</span>}
          <span className="text-[11px] font-semibold uppercase tracking-wider text-white/60">
            {title}
          </span>
        </div>
        <div className="flex items-center gap-0.5">
          {isMaximized ? (
            <button
              onClick={onMinimize}
              className="rounded p-1 text-white/30 hover:bg-white/5 hover:text-white/60"
              title="Restore"
            >
              <Minimize2 className="h-3 w-3" />
            </button>
          ) : (
            <button
              onClick={onMaximize}
              className="rounded p-1 text-white/30 hover:bg-white/5 hover:text-white/60"
              title="Maximize"
            >
              <Maximize2 className="h-3 w-3" />
            </button>
          )}
          {closable && (
            <button
              onClick={onClose}
              className="rounded p-1 text-white/30 hover:bg-red-500/20 hover:text-red-400"
              title="Close"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">{children}</div>
    </div>
  );
});

// ── Main Layout ─────────────────────────────────────────────────────────

/** Stable default cols to avoid new object references on every render */
const DEFAULT_COLS: Record<string, number> = { lg: 12, md: 8, sm: 4 };

export function BloombergLayout({
  panels,
  defaultLayouts,
  cols = DEFAULT_COLS,
  rowHeight = 60,
  onPanelClose,
}: BloombergLayoutProps): React.ReactElement {
  const { width, containerRef, mounted } = useContainerWidth();
  const [layouts, setLayouts] = useState<Layouts>(defaultLayouts);
  const [hiddenPanels, setHiddenPanels] = useState<Set<string>>(new Set());
  const [maximizedPanel, setMaximizedPanel] = useState<string | null>(null);
  const savedLayoutRef = useRef<Layouts>(defaultLayouts);

  // Keep saved layout in sync
  useEffect(() => {
    if (!maximizedPanel) {
      savedLayoutRef.current = layouts;
    }
  }, [layouts, maximizedPanel]);

  /**
   * Persist layout after a user-initiated drag or resize.
   * We intentionally do NOT use onLayoutChange (which fires after every
   * compaction, including renders) to avoid infinite setState loops.
   * Instead, onDragStop/onResizeStop fire only on actual user interaction.
   */
  const breakpoints = useMemo(() => ({ lg: 500, md: 350, sm: 200 }), []);

  const persistLayout = useCallback(
    (currentLayout: RGLLayout) => {
      if (maximizedPanel) return;
      const bp = getBreakpointFromWidth(breakpoints, width);
      setLayouts((prev) => ({ ...prev, [bp]: currentLayout }));
    },
    [maximizedPanel, breakpoints, width],
  );

  // Memoize config objects to prevent new references on every render,
  // which would trigger internal useEffect loops in ResponsiveGridLayout.
  const margin = useMemo((): [number, number] => [4, 4], []);
  const containerPadding = useMemo((): [number, number] => [4, 4], []);

  const dragConfig = useMemo(
    () => ({
      enabled: !maximizedPanel,
      handle: '.bloomberg-drag-handle',
      bounded: false,
      threshold: 3,
    }),
    [maximizedPanel],
  );

  const resizeConfig = useMemo(
    () => ({
      enabled: !maximizedPanel,
      handles: ['se'] as const,
    }),
    [maximizedPanel],
  );

  const handleClose = useCallback(
    (panelId: string) => {
      setHiddenPanels((prev) => new Set(prev).add(panelId));
      onPanelClose?.(panelId);
    },
    [onPanelClose],
  );

  const handleRestore = useCallback((panelId: string) => {
    setHiddenPanels((prev) => {
      const next = new Set(prev);
      next.delete(panelId);
      return next;
    });
  }, []);

  const handleMaximize = useCallback(
    (panelId: string) => {
      savedLayoutRef.current = layouts;
      setMaximizedPanel(panelId);

      const maxLayout: LayoutItem[] = [
        { i: panelId, x: 0, y: 0, w: cols.lg ?? 12, h: 16, static: true },
      ];
      const next = { lg: maxLayout, md: maxLayout, sm: maxLayout };
      setLayouts(next);
    },
    [layouts, cols.lg],
  );

  const handleMinimize = useCallback(() => {
    setMaximizedPanel(null);
    setLayouts(savedLayoutRef.current);
  }, []);

  const handleResetLayout = useCallback(() => {
    setLayouts(defaultLayouts);
    setHiddenPanels(new Set());
    setMaximizedPanel(null);
  }, [defaultLayouts]);

  const visiblePanels = useMemo(
    () =>
      panels.filter((p) => {
        if (maximizedPanel) return p.id === maximizedPanel;
        return !hiddenPanels.has(p.id);
      }),
    [panels, hiddenPanels, maximizedPanel],
  );

  const hiddenList = useMemo(
    () => panels.filter((p) => hiddenPanels.has(p.id)),
    [panels, hiddenPanels],
  );

  return (
    <div ref={containerRef} className="relative h-full w-full">
      {/* Hidden panel restore bar */}
      {(hiddenList.length > 0 || maximizedPanel) && (
        <div className="absolute right-2 top-2 z-30 flex items-center gap-1">
          {hiddenList.map((p) => (
            <button
              key={p.id}
              onClick={() => handleRestore(p.id)}
              className="flex items-center gap-1.5 rounded bg-white/5 px-2 py-1 text-[10px] text-white/50 hover:bg-white/10 hover:text-white/80 transition-colors"
              title={`Restore ${p.title}`}
            >
              {p.icon}
              <span>{p.title}</span>
            </button>
          ))}
          <button
            onClick={handleResetLayout}
            className="rounded bg-white/5 p-1 text-white/30 hover:bg-white/10 hover:text-white/60 transition-colors"
            title="Reset layout"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {mounted && (
        <ResponsiveGridLayout
          className="bloomberg-grid"
          width={width}
          layouts={layouts}
          breakpoints={breakpoints}
          cols={cols}
          rowHeight={rowHeight}
          margin={margin}
          containerPadding={containerPadding}
          dragConfig={dragConfig}
          resizeConfig={resizeConfig}
          onDragStop={persistLayout}
          onResizeStop={persistLayout}
          compactor={verticalCompactor}
        >
          {visiblePanels.map((panel) => (
            <div key={panel.id} className="bloomberg-panel">
              <PanelChrome
                title={panel.title}
                icon={panel.icon}
                isMaximized={maximizedPanel === panel.id}
                closable={panel.closable ?? true}
                onMaximize={() => handleMaximize(panel.id)}
                onMinimize={handleMinimize}
                onClose={() => handleClose(panel.id)}
              >
                {panel.children}
              </PanelChrome>
            </div>
          ))}
        </ResponsiveGridLayout>
      )}
    </div>
  );
}
