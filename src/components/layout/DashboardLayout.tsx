/**
 * Main dashboard layout with Bloomberg-style draggable panel grid.
 *
 * Globe occupies the left portion. The right side uses react-grid-layout
 * for freely moveable/resizable panels (satellite growth, space weather,
 * at-risk satellites, upcoming launches).
 *
 * The globe panel stays fixed; only the feature panels are rearrangeable.
 */

'use client';

import React, { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Group, Panel } from 'react-resizable-panels';
import { Sidebar } from '@/components/ui/Sidebar';
import { Header } from '@/components/layout/Header';
import { ResizeHandle } from '@/components/layout/ResizeHandle';
import { TimelineScrubber } from '@/components/ui/TimelineScrubber';
import { DebugOverlay } from '@/components/ui/DebugOverlay';
import { PluginRenderer } from '@/lib/plugins/PluginRenderer';
import { BloombergLayout, type PanelConfig, type Layouts } from '@/components/layout/BloombergLayout';
import {
  BarChart3,
  Sun,
  AlertTriangle,
  Rocket,
  Radio,
} from 'lucide-react';

/* ── Dynamic imports (no SSR — all use browser APIs) ──── */

const GlobeContainer = dynamic(
  () => import('@/features/globe/GlobeContainer').then((m) => m.GlobeContainer),
  { ssr: false }
);

const SatelliteLayer = dynamic(
  () => import('@/features/satellites/SatelliteLayer').then((m) => m.SatelliteLayer),
  { ssr: false }
);

const LaunchPin = dynamic(
  () => import('@/features/launches/LaunchPin').then((m) => m.LaunchPin),
  { ssr: false }
);

const TrajectoryOverlay = dynamic(
  () => import('@/features/launches/TrajectoryOverlay').then((m) => m.TrajectoryOverlay),
  { ssr: false }
);

const SatelliteGrowthPanel = dynamic(
  () => import('@/features/graphs/SatelliteGrowthPanel').then((m) => m.SatelliteGrowthPanel),
  { ssr: false }
);

const SpaceWeatherPanel = dynamic(
  () => import('@/features/weather/SpaceWeatherPanel').then((m) => m.SpaceWeatherPanel),
  { ssr: false }
);

const AtRiskSatellites = dynamic(
  () => import('@/features/weather/AtRiskSatellites').then((m) => m.AtRiskSatellites),
  { ssr: false }
);

const UpcomingLaunchesPanel = dynamic(
  () => import('@/features/launches/UpcomingLaunchesPanel').then((m) => m.UpcomingLaunchesPanel),
  { ssr: false }
);

const LiveStreamPanel = dynamic(
  () => import('@/features/launches/LiveStreamPanel').then((m) => m.LiveStreamPanel),
  { ssr: false }
);

const SatelliteDetailPopup = dynamic(
  () => import('@/features/satellites/SatelliteDetailPopup').then((m) => m.SatelliteDetailPopup),
  { ssr: false }
);

/* ── Default Bloomberg grid layout ──────────────────────── */

/**
 * Default grid layouts per breakpoint.
 *
 * The grid lives inside the right column (~35% of viewport), so actual
 * widths are much smaller than full-page breakpoints. We use low
 * breakpoint thresholds to ensure side-by-side placement works at
 * typical right-column widths (400–700px).
 */
const DEFAULT_LAYOUTS: Layouts = {
  lg: [
    { i: 'satellite-growth', x: 0, y: 0, w: 6, h: 4, minW: 3, minH: 3 },
    { i: 'upcoming-launches', x: 6, y: 0, w: 6, h: 4, minW: 3, minH: 3 },
    { i: 'live-stream', x: 0, y: 4, w: 6, h: 5, minW: 4, minH: 4 },
    { i: 'space-weather', x: 6, y: 4, w: 6, h: 5, minW: 3, minH: 3 },
    { i: 'at-risk-satellites', x: 0, y: 9, w: 12, h: 4, minW: 3, minH: 3 },
  ],
  md: [
    { i: 'satellite-growth', x: 0, y: 0, w: 4, h: 4, minW: 2, minH: 3 },
    { i: 'upcoming-launches', x: 4, y: 0, w: 4, h: 4, minW: 2, minH: 3 },
    { i: 'live-stream', x: 0, y: 4, w: 4, h: 5, minW: 3, minH: 4 },
    { i: 'space-weather', x: 4, y: 4, w: 4, h: 5, minW: 2, minH: 3 },
    { i: 'at-risk-satellites', x: 0, y: 9, w: 8, h: 4, minW: 2, minH: 3 },
  ],
  sm: [
    { i: 'satellite-growth', x: 0, y: 0, w: 4, h: 4, minW: 4, minH: 3 },
    { i: 'upcoming-launches', x: 0, y: 4, w: 4, h: 4, minW: 4, minH: 3 },
    { i: 'live-stream', x: 0, y: 8, w: 4, h: 5, minW: 4, minH: 4 },
    { i: 'space-weather', x: 0, y: 13, w: 4, h: 5, minW: 4, minH: 3 },
    { i: 'at-risk-satellites', x: 0, y: 18, w: 4, h: 4, minW: 4, minH: 3 },
  ],
};

/* ── Layout ───────────────────────────────────────────── */

export function DashboardLayout(): React.ReactElement {
  const panels: PanelConfig[] = useMemo(
    () => [
      {
        id: 'satellite-growth',
        title: 'Satellite Growth',
        icon: <BarChart3 className="h-3 w-3" />,
        children: <SatelliteGrowthPanel />,
      },
      {
        id: 'space-weather',
        title: 'Space Weather',
        icon: <Sun className="h-3 w-3" />,
        children: <SpaceWeatherPanel />,
      },
      {
        id: 'upcoming-launches',
        title: 'Upcoming Launches',
        icon: <Rocket className="h-3 w-3" />,
        children: <UpcomingLaunchesPanel />,
      },
      {
        id: 'live-stream',
        title: 'Live Stream',
        icon: <Radio className="h-3 w-3" />,
        children: <LiveStreamPanel />,
      },
      {
        id: 'at-risk-satellites',
        title: 'At-Risk Satellites',
        icon: <AlertTriangle className="h-3 w-3" />,
        children: <AtRiskSatellites />,
      },
    ],
    [],
  );

  return (
    <div className="w-screen h-screen overflow-hidden bg-space-darker">
      {/* Background grid */}
      <div className="fixed inset-0 grid-background opacity-20 pointer-events-none z-0" />

      {/* Main layout */}
      <div className="relative z-10 w-full h-full flex flex-col">
        {/* Sidebar */}
        <Sidebar />

        {/* Header */}
        <Header />

        {/* Content area — globe + Bloomberg panel grid */}
        <div className="flex-1 pt-16 pl-20 overflow-hidden">
          <Group orientation="horizontal" id="spacepulse-main">

            {/* ── Left panel: Globe + layers ─────────────── */}
            <Panel
              id="globe"
              defaultSize={65}
              minSize={35}
              className="relative"
            >
              <GlobeContainer />
              <SatelliteLayer />
              <LaunchPin />
              <TrajectoryOverlay />
              <PluginRenderer location="main" />
            </Panel>

            <ResizeHandle orientation="horizontal" id="globe-right-handle" />

            {/* ── Right column: Bloomberg-style panels ──── */}
            <Panel
              id="right-column"
              defaultSize={35}
              minSize={20}
            >
              <BloombergLayout
                panels={panels}
                defaultLayouts={DEFAULT_LAYOUTS}
              />
            </Panel>

          </Group>
        </div>

        {/* Satellite detail popup (floating over globe) */}
        <SatelliteDetailPopup />

        {/* Bottom timeline */}
        <TimelineScrubber />

        {/* Debug overlay */}
        <DebugOverlay />
      </div>
    </div>
  );
}
