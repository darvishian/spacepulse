/**
 * SatelliteDetailPopup — floating popup when clicking a satellite on the globe.
 *
 * Shows satellite metadata (name, constellation, orbit type, operator, function)
 * plus a mini orbit path visualization using SVG. Also displays live orbital
 * parameters (altitude, velocity, heading, footprint).
 *
 * The popup is positioned near the globe center and can be dismissed.
 */

'use client';

import React, { useMemo, useCallback, useEffect, useState } from 'react';
import {
  X,
  Gauge,
  Navigation,
  Radio,
  Globe2,
  Satellite,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useGlobeStore } from '../globe/store';
import { useSatelliteStore } from './store';
import { useConstellationData } from './hooks/useSatelliteData';
import type { OrbitType } from './types';

// ── Orbit type display helpers ────────────────────────────────────────────

const ORBIT_COLORS: Record<string, string> = {
  LEO: '#00d4ff',
  MEO: '#00ff88',
  GEO: '#ff6b35',
  HEO: '#aa88ff',
};

const ORBIT_DESCRIPTIONS: Record<string, string> = {
  LEO: 'Low Earth Orbit (160–2,000 km)',
  MEO: 'Medium Earth Orbit (2,000–35,786 km)',
  GEO: 'Geostationary Orbit (~35,786 km)',
  HEO: 'Highly Elliptical Orbit',
};

function classifyOrbit(altitude: number): OrbitType {
  if (altitude < 2000) return 'LEO' as OrbitType;
  if (altitude < 35786) return 'MEO' as OrbitType;
  if (altitude < 36000) return 'GEO' as OrbitType;
  return 'HEO' as OrbitType;
}

// ── Mini orbit path SVG ───────────────────────────────────────────────────

interface OrbitPathSVGProps {
  inclination: number;    // degrees
  altitude: number;       // km
  orbitType: string;
  /** Current position along orbit (0–1) */
  position: number;
}

function OrbitPathSVG({ inclination, altitude, orbitType, position }: OrbitPathSVGProps): React.ReactElement {
  const color = ORBIT_COLORS[orbitType] || '#888';
  const size = 160;
  const cx = size / 2;
  const cy = size / 2;
  const earthR = 30;

  // Orbit ellipse — tilt by inclination
  const orbitRx = earthR + 15 + Math.min(altitude / 200, 40);
  const orbitRy = orbitRx * 0.85;

  // Satellite position along ellipse
  const angle = position * Math.PI * 2;
  const satX = cx + orbitRx * Math.cos(angle);
  const satY = cy + orbitRy * Math.sin(angle);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="mx-auto">
      {/* Star background */}
      {Array.from({ length: 20 }).map((_, i) => (
        <circle
          key={i}
          cx={10 + (i * 37) % (size - 20)}
          cy={5 + (i * 53) % (size - 10)}
          r={0.5 + (i % 3) * 0.3}
          fill="white"
          opacity={0.15 + (i % 4) * 0.05}
        />
      ))}

      {/* Earth */}
      <defs>
        <radialGradient id="earthGrad">
          <stop offset="0%" stopColor="#1a3a5c" />
          <stop offset="60%" stopColor="#0d2840" />
          <stop offset="100%" stopColor="#061520" />
        </radialGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Atmosphere glow */}
      <circle cx={cx} cy={cy} r={earthR + 4} fill="none" stroke="#00d4ff" strokeWidth={1} opacity={0.15} />
      <circle cx={cx} cy={cy} r={earthR + 2} fill="none" stroke="#00d4ff" strokeWidth={0.5} opacity={0.25} />

      {/* Earth body */}
      <circle cx={cx} cy={cy} r={earthR} fill="url(#earthGrad)" stroke="#1a4a6c" strokeWidth={0.5} />

      {/* Continent hint */}
      <ellipse cx={cx - 5} cy={cy - 5} rx={10} ry={8} fill="#1a5a3c" opacity={0.4} />
      <ellipse cx={cx + 8} cy={cy + 3} rx={7} ry={12} fill="#1a5a3c" opacity={0.3} />

      {/* Orbit path */}
      <g transform={`rotate(${-inclination}, ${cx}, ${cy})`}>
        <ellipse
          cx={cx}
          cy={cy}
          rx={orbitRx}
          ry={orbitRy}
          fill="none"
          stroke={color}
          strokeWidth={1}
          strokeDasharray="3 2"
          opacity={0.4}
        />

        {/* Orbit trail (behind satellite) */}
        <ellipse
          cx={cx}
          cy={cy}
          rx={orbitRx}
          ry={orbitRy}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          strokeDasharray={`${orbitRx * Math.PI * 0.4} ${orbitRx * Math.PI * 1.6}`}
          strokeDashoffset={-position * orbitRx * Math.PI * 2}
          opacity={0.6}
        />
      </g>

      {/* Satellite dot */}
      <g transform={`rotate(${-inclination}, ${cx}, ${cy})`} filter="url(#glow)">
        <circle cx={satX} cy={satY} r={4} fill={color} opacity={0.9} />
        <circle cx={satX} cy={satY} r={6} fill="none" stroke={color} strokeWidth={0.5} opacity={0.4} />
      </g>

      {/* Orbit label */}
      <text x={size - 8} y={size - 6} textAnchor="end" fontSize={9} fill={color} opacity={0.6}>
        {orbitType}
      </text>
    </svg>
  );
}

// ── Main Popup ───────────────────────────────────────────────────────────

export function SatelliteDetailPopup(): React.ReactElement | null {
  const entity = useGlobeStore((s) => s.selectedGlobeEntity);
  const setSelectedGlobeEntity = useGlobeStore((s) => s.setSelectedGlobeEntity);
  const setSelectedSatellite = useSatelliteStore((s) => s.setSelectedSatellite);
  const { data: constellations } = useConstellationData();

  const [expanded, setExpanded] = useState(false);
  const [orbitProgress, setOrbitProgress] = useState(0);

  // Only show for satellite entities
  const isSatellite = entity?.type === 'satellite';

  // Animate orbit position
  useEffect(() => {
    if (!isSatellite) return;
    const interval = setInterval(() => {
      setOrbitProgress((p) => (p + 0.005) % 1);
    }, 50);
    return () => clearInterval(interval);
  }, [isSatellite]);

  // Find constellation metadata
  const constellationInfo = useMemo(() => {
    if (!entity?.properties?.constellation || !constellations) return null;
    const name = String(entity.properties.constellation).toLowerCase();
    return constellations.find(
      (c) => c.name.toLowerCase() === name || c.id.toLowerCase() === name,
    );
  }, [entity, constellations]);

  const handleClose = useCallback(() => {
    setSelectedGlobeEntity(null);
    setSelectedSatellite(null);
  }, [setSelectedGlobeEntity, setSelectedSatellite]);

  if (!isSatellite || !entity) return null;

  const { latitude, longitude, altitude } = entity.position;
  const altKm = altitude ?? 0;
  const orbitType = classifyOrbit(altKm);
  const orbitColor = ORBIT_COLORS[orbitType] || '#888';

  const velocity = entity.properties?.velocity as number | undefined;
  const heading = entity.properties?.heading as number | undefined;
  const footprint = entity.properties?.footprint as number | undefined;
  const constellation = entity.properties?.constellation as string | undefined;

  // Inclination from TLE line2 (degrees) — approximate from latitude for now
  const inclination = Math.min(Math.abs(latitude) + 15, 90);

  return (
    <div className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[360px] animate-in fade-in zoom-in-95 duration-200">
      <div className="overflow-hidden rounded-lg border border-white/[0.08] bg-space-darker/95 backdrop-blur-md shadow-2xl shadow-black/50">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.06] bg-white/[0.02] px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Satellite className="h-4 w-4 text-space-accent" />
            <span className="text-sm font-semibold text-white/90 truncate max-w-[240px]">
              {entity.name}
            </span>
          </div>
          <button
            onClick={handleClose}
            className="rounded p-1 text-white/30 hover:bg-white/10 hover:text-white/70 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Orbit visualization */}
        <div className="relative border-b border-white/[0.04] bg-black/20 py-2">
          <OrbitPathSVG
            inclination={inclination}
            altitude={altKm}
            orbitType={orbitType}
            position={orbitProgress}
          />
          {/* Orbit type badge overlay */}
          <div className="absolute left-3 top-3">
            <span
              className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase"
              style={{
                color: orbitColor,
                backgroundColor: `${orbitColor}15`,
                border: `1px solid ${orbitColor}30`,
              }}
            >
              {orbitType}
            </span>
          </div>
        </div>

        {/* Key info grid */}
        <div className="grid grid-cols-2 gap-px bg-white/[0.03] p-3">
          <InfoCell
            icon={<Globe2 className="h-3.5 w-3.5" />}
            label="Altitude"
            value={`${altKm.toFixed(1)} km`}
          />
          <InfoCell
            icon={<Gauge className="h-3.5 w-3.5" />}
            label="Velocity"
            value={velocity ? `${velocity.toFixed(2)} km/s` : '—'}
          />
          <InfoCell
            icon={<Navigation className="h-3.5 w-3.5" />}
            label="Heading"
            value={heading ? `${heading.toFixed(1)}°` : '—'}
          />
          <InfoCell
            icon={<Radio className="h-3.5 w-3.5" />}
            label="Footprint"
            value={footprint ? `${footprint.toFixed(0)} km` : '—'}
          />
        </div>

        {/* Orbit & constellation details */}
        <div className="border-t border-white/[0.04] px-4 py-3 space-y-2.5">
          <DetailRow label="Orbit" value={ORBIT_DESCRIPTIONS[orbitType] || orbitType} />
          <DetailRow
            label="Position"
            value={`${latitude.toFixed(4)}° / ${longitude.toFixed(4)}°`}
          />
          {constellation && (
            <DetailRow label="Constellation" value={constellation} />
          )}
          {constellationInfo && (
            <>
              <DetailRow label="Operator" value={constellationInfo.operator} />
              {constellationInfo.description && (
                <DetailRow label="Function" value={constellationInfo.description} />
              )}
            </>
          )}
        </div>

        {/* Expand for more details */}
        {constellationInfo && (
          <>
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex w-full items-center justify-center gap-1 border-t border-white/[0.04] py-2 text-[10px] uppercase tracking-wider text-white/30 hover:bg-white/[0.02] hover:text-white/50 transition-colors"
            >
              {expanded ? (
                <>
                  Less <ChevronUp className="h-3 w-3" />
                </>
              ) : (
                <>
                  More Details <ChevronDown className="h-3 w-3" />
                </>
              )}
            </button>

            {expanded && (
              <div className="border-t border-white/[0.04] px-4 py-3 space-y-2.5">
                <DetailRow
                  label="Total Satellites"
                  value={String(constellationInfo.satelliteCount)}
                />
                <DetailRow label="Orbit Type" value={constellationInfo.orbitType} />
                {constellationInfo.website && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/30">Website</span>
                    <a
                      href={constellationInfo.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-space-accent/70 hover:text-space-accent truncate max-w-[200px]"
                    >
                      {constellationInfo.website.replace(/https?:\/\//, '')}
                    </a>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────

function InfoCell({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}): React.ReactElement {
  return (
    <div className="flex items-center gap-2 rounded bg-white/[0.02] px-2.5 py-2">
      <span className="text-space-accent/50">{icon}</span>
      <div>
        <div className="text-[9px] uppercase tracking-wider text-white/25">{label}</div>
        <div className="text-xs font-semibold tabular-nums text-white/80">{value}</div>
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}): React.ReactElement {
  return (
    <div className="flex items-start justify-between gap-4 text-xs">
      <span className="shrink-0 text-white/30">{label}</span>
      <span className="text-right text-white/70">{value}</span>
    </div>
  );
}
