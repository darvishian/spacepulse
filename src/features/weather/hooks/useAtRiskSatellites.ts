/**
 * Hook that identifies satellites at risk during dangerous space weather.
 *
 * Triggers: Kp >= 5 (geomagnetic storm G1+) OR X-ray flux >= M-class (solar flare).
 *
 * Risk model (simplified):
 * - LEO  (<2000 km): Atmospheric drag increase from geomagnetic heating,
 *                     radiation exposure from solar energetic particles.
 * - MEO  (2000–35786 km): Radiation belt expansion (South Atlantic Anomaly grows),
 *                          single-event upsets from trapped particles.
 * - GEO  (~35786 km): Surface charging from hot plasma injection,
 *                      radiation from energetic electrons.
 * - HEO  (>35786 km): Passes through both radiation belts on each orbit,
 *                      extended radiation exposure at apogee.
 */

'use client';

import { useMemo } from 'react';
import { useConstellationData } from '@/features/satellites/hooks/useSatelliteData';
import { useSpaceWeather } from './useSpaceWeather';
import type { KpIndex, XrayFlux } from '../types';
import type { Constellation } from '@/features/satellites/types';

// ── Risk types ──────────────────────────────────────────────────────────

export type RiskLevel = 'critical' | 'high' | 'moderate' | 'low';

export interface AtRiskConstellation {
  constellation: Constellation;
  riskLevel: RiskLevel;
  riskFactors: string[];
  estimatedImpact: string;
}

export interface AtRiskSummary {
  isDangerous: boolean;
  triggerReasons: string[];
  constellations: AtRiskConstellation[];
  totalSatellitesAtRisk: number;
  isLoading: boolean;
}

// ── Threshold checks ────────────────────────────────────────────────────

function isKpDangerous(kp: KpIndex | null): boolean {
  return (kp?.value ?? 0) >= 5;
}

function isFlareDangerous(xray: XrayFlux | null): boolean {
  const cls = xray?.classification ?? 'A';
  return cls === 'M' || cls === 'X';
}

// ── Risk assessment per orbit type ──────────────────────────────────────

function assessRisk(
  constellation: Constellation,
  kpIndex: KpIndex | null,
  xrayFlux: XrayFlux | null,
): AtRiskConstellation {
  const kp = kpIndex?.value ?? 0;
  const flareClass = xrayFlux?.classification ?? 'A';
  const orbit = constellation.orbitType;

  const riskFactors: string[] = [];
  let riskLevel: RiskLevel = 'low';
  let estimatedImpact = '';

  // ── LEO risks ───────────────────────────────────────────
  if (orbit === 'LEO') {
    if (kp >= 7) {
      riskLevel = 'critical';
      riskFactors.push('Severe atmospheric drag increase');
      riskFactors.push('Potential uncontrolled orbit decay');
      estimatedImpact = 'Orbit lowering, collision risk increase';
    } else if (kp >= 5) {
      riskLevel = kp >= 6 ? 'high' : 'moderate';
      riskFactors.push('Increased atmospheric drag from thermosphere heating');
      estimatedImpact = 'Accelerated orbital decay, station-keeping fuel burn';
    }
    if (flareClass === 'X') {
      riskLevel = 'critical';
      riskFactors.push('Intense radiation from solar energetic particles');
      estimatedImpact = 'Electronics damage risk, crew radiation exposure';
    } else if (flareClass === 'M') {
      if (riskLevel === 'low') riskLevel = 'moderate';
      riskFactors.push('Elevated radiation from solar flare');
      if (!estimatedImpact) estimatedImpact = 'Possible single-event upsets';
    }
  }

  // ── MEO risks ───────────────────────────────────────────
  if (orbit === 'MEO') {
    if (kp >= 7) {
      riskLevel = 'high';
      riskFactors.push('Radiation belt expansion into MEO corridor');
      estimatedImpact = 'Increased single-event upsets, nav signal degradation';
    } else if (kp >= 5) {
      riskLevel = 'moderate';
      riskFactors.push('South Atlantic Anomaly expansion');
      estimatedImpact = 'Intermittent accuracy degradation';
    }
    if (flareClass === 'X') {
      riskLevel = 'high';
      riskFactors.push('Energetic particle bombardment');
      estimatedImpact = 'Navigation accuracy impact, electronics stress';
    } else if (flareClass === 'M') {
      if (riskLevel === 'low') riskLevel = 'moderate';
      riskFactors.push('Elevated trapped particle flux');
      if (!estimatedImpact) estimatedImpact = 'Minor accuracy fluctuations';
    }
  }

  // ── GEO risks ───────────────────────────────────────────
  if (orbit === 'GEO') {
    if (kp >= 7) {
      riskLevel = 'high';
      riskFactors.push('Hot plasma injection at GEO altitude');
      riskFactors.push('Surface charging hazard');
      estimatedImpact = 'Electrostatic discharge risk, comm disruption';
    } else if (kp >= 5) {
      riskLevel = 'moderate';
      riskFactors.push('Energetic electron flux increase');
      estimatedImpact = 'Internal charging buildup over hours';
    }
    if (flareClass === 'X') {
      riskLevel = riskLevel === 'low' ? 'high' : riskLevel;
      riskFactors.push('Solar proton event exposure');
      estimatedImpact = 'Solar panel degradation, sensor noise';
    } else if (flareClass === 'M') {
      if (riskLevel === 'low') riskLevel = 'low'; // M-class usually fine at GEO
      riskFactors.push('Minor proton flux elevation');
      if (!estimatedImpact) estimatedImpact = 'Negligible — monitoring recommended';
    }
  }

  // ── HEO risks ───────────────────────────────────────────
  if (orbit === 'HEO') {
    if (kp >= 6) {
      riskLevel = 'high';
      riskFactors.push('Transits both expanded radiation belts');
      estimatedImpact = 'Extended radiation belt passage, cumulative damage';
    } else if (kp >= 5) {
      riskLevel = 'moderate';
      riskFactors.push('Radiation belt exposure during belt transits');
      estimatedImpact = 'Increased total ionizing dose per orbit';
    }
    if (flareClass === 'X') {
      riskLevel = 'critical';
      riskFactors.push('Unshielded at apogee during solar particle event');
      estimatedImpact = 'Direct particle impact at high altitude';
    } else if (flareClass === 'M') {
      if (riskLevel === 'low') riskLevel = 'moderate';
      riskFactors.push('Elevated particle environment at apogee');
      if (!estimatedImpact) estimatedImpact = 'Cumulative dose increase';
    }
  }

  // If no specific risks identified, default message
  if (riskFactors.length === 0) {
    riskFactors.push('General space weather advisory');
    estimatedImpact = 'Monitoring recommended';
  }

  return {
    constellation,
    riskLevel,
    riskFactors,
    estimatedImpact,
  };
}

// ── Main hook ───────────────────────────────────────────────────────────

export function useAtRiskSatellites(): AtRiskSummary {
  const { kpIndex, xrayFlux, isLoading: weatherLoading } = useSpaceWeather();
  const { data: constellations, isLoading: consLoading } = useConstellationData();

  const result = useMemo((): Omit<AtRiskSummary, 'isLoading'> => {
    const kpDanger = isKpDangerous(kpIndex);
    const flareDanger = isFlareDangerous(xrayFlux);
    const isDangerous = kpDanger || flareDanger;

    if (!isDangerous || !constellations) {
      return {
        isDangerous: false,
        triggerReasons: [],
        constellations: [],
        totalSatellitesAtRisk: 0,
      };
    }

    // Build trigger explanation
    const triggerReasons: string[] = [];
    if (kpDanger) {
      const kp = kpIndex!.value;
      const gLevel = kp >= 9 ? 'G5' : kp >= 8 ? 'G4' : kp >= 7 ? 'G3' : kp >= 6 ? 'G2' : 'G1';
      triggerReasons.push(`Kp ${kp} — ${gLevel} geomagnetic storm`);
    }
    if (flareDanger) {
      triggerReasons.push(`${xrayFlux!.classification}-class solar flare detected`);
    }

    // Assess risk for each constellation
    const assessed = constellations
      .map((c) => assessRisk(c, kpIndex, xrayFlux))
      .filter((a) => a.riskLevel !== 'low')
      .sort((a, b) => {
        const order: Record<RiskLevel, number> = { critical: 0, high: 1, moderate: 2, low: 3 };
        return order[a.riskLevel] - order[b.riskLevel];
      });

    const totalSatellitesAtRisk = assessed.reduce(
      (sum, a) => sum + a.constellation.satelliteCount,
      0,
    );

    return {
      isDangerous: true,
      triggerReasons,
      constellations: assessed,
      totalSatellitesAtRisk,
    };
  }, [kpIndex, xrayFlux, constellations]);

  return {
    ...result,
    isLoading: weatherLoading || consLoading,
  };
}
