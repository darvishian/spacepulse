/**
 * AtRiskSatellites — shows constellations/satellites at risk during
 * dangerous space weather (Kp >= 5 or M/X-class flare).
 * Designed to sit directly below SpaceWeatherPanel in the right column.
 */

'use client';

import React from 'react';
import { ShieldAlert, Satellite, ChevronDown, ChevronRight } from 'lucide-react';
import { useAtRiskSatellites, type AtRiskConstellation, type RiskLevel } from './hooks/useAtRiskSatellites';

// ── Risk level colors ───────────────────────────────────────────────────

function getRiskColor(level: RiskLevel): string {
  switch (level) {
    case 'critical': return 'text-red-500';
    case 'high':     return 'text-orange-500';
    case 'moderate': return 'text-yellow-400';
    default:         return 'text-white/40';
  }
}

function getRiskBgColor(level: RiskLevel): string {
  switch (level) {
    case 'critical': return 'bg-red-500/15 border-red-500/25';
    case 'high':     return 'bg-orange-500/10 border-orange-500/20';
    case 'moderate': return 'bg-yellow-400/10 border-yellow-400/15';
    default:         return 'bg-white/5 border-white/10';
  }
}

function getRiskDot(level: RiskLevel): string {
  switch (level) {
    case 'critical': return 'bg-red-500';
    case 'high':     return 'bg-orange-500';
    case 'moderate': return 'bg-yellow-400';
    default:         return 'bg-white/30';
  }
}

function getRiskLabel(level: RiskLevel): string {
  switch (level) {
    case 'critical': return 'CRITICAL';
    case 'high':     return 'HIGH';
    case 'moderate': return 'MODERATE';
    default:         return 'LOW';
  }
}

// ── Orbit altitude labels ───────────────────────────────────────────────

function getOrbitAltitude(orbitType: string): string {
  switch (orbitType) {
    case 'LEO': return '< 2,000 km';
    case 'MEO': return '2,000–35,786 km';
    case 'GEO': return '~35,786 km';
    case 'HEO': return '> 35,786 km';
    default:    return '';
  }
}

// ── Main component ──────────────────────────────────────────────────────

export function AtRiskSatellites(): React.ReactElement {
  const { isDangerous, triggerReasons, constellations, totalSatellitesAtRisk, isLoading } =
    useAtRiskSatellites();

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-space-darker/60">
      {/* Header */}
      <div className={`flex shrink-0 items-center justify-between border-b px-4 py-2.5 ${
        isDangerous ? 'border-red-500/20 bg-red-500/5' : 'border-white/5'
      }`}>
        <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-space-accent/80">
          <ShieldAlert className="h-3.5 w-3.5" />
          At-Risk Satellites
        </span>
        {isDangerous && totalSatellitesAtRisk > 0 && (
          <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold tabular-nums text-red-400">
            {totalSatellitesAtRisk.toLocaleString()} sats
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-space-accent/30 border-t-space-accent" />
          </div>
        ) : !isDangerous ? (
          <QuietState />
        ) : (
          <div className="space-y-0">
            {/* Trigger banner */}
            <div className="border-b border-red-500/10 bg-red-500/5 px-4 py-2">
              {triggerReasons.map((reason, i) => (
                <div key={i} className="flex items-center gap-2 text-[11px] text-red-400">
                  <span className="h-1 w-1 rounded-full bg-red-500" />
                  {reason}
                </div>
              ))}
            </div>

            {/* Constellation risk list */}
            <div className="divide-y divide-white/5">
              {constellations.map((entry) => (
                <ConstellationRiskRow key={entry.constellation.id} entry={entry} />
              ))}
            </div>

            {/* Summary footer */}
            <div className="border-t border-white/5 px-4 py-2">
              <div className="text-[10px] text-white/30">
                {constellations.length} constellation{constellations.length !== 1 ? 's' : ''} affected
                {' · '}
                {totalSatellitesAtRisk.toLocaleString()} satellites at risk
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Quiet state (no danger) ─────────────────────────────────────────────

function QuietState(): React.ReactElement {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8 px-4 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-space-success/10">
        <Satellite className="h-5 w-5 text-space-success" />
      </div>
      <div>
        <div className="text-xs font-semibold text-space-success">All Clear</div>
        <div className="mt-0.5 text-[10px] text-white/30 leading-relaxed">
          Space weather is within safe limits.
          <br />
          No constellations currently at risk.
        </div>
      </div>
      <div className="mt-1 rounded-lg bg-white/[0.02] px-3 py-1.5">
        <div className="text-[9px] text-white/20 uppercase tracking-wider">Monitoring thresholds</div>
        <div className="mt-1 flex gap-3 text-[10px] text-white/30">
          <span>Kp &ge; 5</span>
          <span className="text-white/10">|</span>
          <span>X-ray &ge; M-class</span>
        </div>
      </div>
    </div>
  );
}

// ── Constellation risk row ──────────────────────────────────────────────

function ConstellationRiskRow({ entry }: { entry: AtRiskConstellation }): React.ReactElement {
  const [expanded, setExpanded] = React.useState(entry.riskLevel === 'critical');

  return (
    <div className={`${entry.riskLevel === 'critical' ? 'bg-red-500/[0.03]' : ''}`}>
      {/* Constellation header */}
      <button
        onClick={() => setExpanded((prev) => !prev)}
        className="flex w-full items-center gap-2 px-4 py-2 text-left transition-colors hover:bg-white/[0.03]"
      >
        {expanded ? (
          <ChevronDown className="h-3 w-3 shrink-0 text-white/20" />
        ) : (
          <ChevronRight className="h-3 w-3 shrink-0 text-white/20" />
        )}

        {/* Risk dot */}
        <span className={`h-2 w-2 shrink-0 rounded-full ${getRiskDot(entry.riskLevel)} ${
          entry.riskLevel === 'critical' ? 'animate-pulse' : ''
        }`} />

        {/* Name + orbit */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-white/80 truncate">
              {entry.constellation.name}
            </span>
            <span className="shrink-0 rounded bg-white/5 px-1 py-0.5 text-[9px] text-white/30">
              {entry.constellation.orbitType}
            </span>
          </div>
        </div>

        {/* Satellite count + risk badge */}
        <span className="shrink-0 text-[10px] tabular-nums text-white/30">
          {entry.constellation.satelliteCount.toLocaleString()}
        </span>
        <span className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold tracking-wider ${getRiskColor(entry.riskLevel)} ${getRiskBgColor(entry.riskLevel)} border`}>
          {getRiskLabel(entry.riskLevel)}
        </span>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="px-4 pb-2.5 pl-11">
          <div className="rounded-lg bg-white/[0.02] p-2 space-y-1.5">
            {/* Orbit altitude */}
            <div className="text-[10px] text-white/30">
              <span className="text-white/20">Altitude: </span>
              {getOrbitAltitude(entry.constellation.orbitType)}
              {entry.constellation.operator && (
                <>
                  <span className="text-white/10"> · </span>
                  <span className="text-white/20">Op: </span>
                  {entry.constellation.operator}
                </>
              )}
            </div>

            {/* Risk factors */}
            <div className="space-y-0.5">
              {entry.riskFactors.map((factor, i) => (
                <div key={i} className="flex items-start gap-1.5 text-[10px]">
                  <span className={`mt-1 h-1 w-1 shrink-0 rounded-full ${getRiskDot(entry.riskLevel)}`} />
                  <span className="text-white/50">{factor}</span>
                </div>
              ))}
            </div>

            {/* Impact summary */}
            <div className={`text-[10px] font-medium ${getRiskColor(entry.riskLevel)}`}>
              {entry.estimatedImpact}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
