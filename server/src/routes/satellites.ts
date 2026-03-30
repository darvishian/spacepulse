import { Router, Request, Response } from 'express';
import celestrakService from '../services/celestrak.service';

/**
 * Satellites API Routes
 * Serves TLE data, constellation metadata, growth stats, and individual positions.
 */

const router = Router();

/** Known constellations with static metadata + Celestrak group keys. */
const CONSTELLATION_META: Record<
  string,
  { name: string; operator: string; purpose: string; orbitType: string; website: string }
> = {
  starlink: {
    name: 'Starlink',
    operator: 'SpaceX',
    purpose: 'Broadband internet',
    orbitType: 'leo',
    website: 'https://www.starlink.com',
  },
  oneweb: {
    name: 'OneWeb',
    operator: 'Eutelsat OneWeb',
    purpose: 'Broadband internet',
    orbitType: 'leo',
    website: 'https://oneweb.net',
  },
  iridium: {
    name: 'Iridium NEXT',
    operator: 'Iridium Communications',
    purpose: 'Mobile communications',
    orbitType: 'leo',
    website: 'https://www.iridium.com',
  },
  globalstar: {
    name: 'Globalstar',
    operator: 'Globalstar Inc.',
    purpose: 'Mobile communications',
    orbitType: 'leo',
    website: 'https://www.globalstar.com',
  },
  gps: {
    name: 'GPS',
    operator: 'US Space Force',
    purpose: 'Navigation',
    orbitType: 'meo',
    website: 'https://www.gps.gov',
  },
  glonass: {
    name: 'GLONASS',
    operator: 'Roscosmos',
    purpose: 'Navigation',
    orbitType: 'meo',
    website: 'https://www.glonass-iac.ru',
  },
  galileo: {
    name: 'Galileo',
    operator: 'European Space Agency',
    purpose: 'Navigation',
    orbitType: 'meo',
    website: 'https://www.gsc-europa.eu',
  },
  planet: {
    name: 'Planet Labs',
    operator: 'Planet Labs PBC',
    purpose: 'Earth observation',
    orbitType: 'leo',
    website: 'https://www.planet.com',
  },
  spire: {
    name: 'Spire',
    operator: 'Spire Global',
    purpose: 'Weather & maritime tracking',
    orbitType: 'leo',
    website: 'https://spire.com',
  },
  telesat: {
    name: 'Telesat',
    operator: 'Telesat',
    purpose: 'Broadband internet',
    orbitType: 'leo',
    website: 'https://www.telesat.com',
  },
};

/**
 * GET /api/satellites/tle
 * Returns TLE records. Optional ?constellation= filter.
 */
router.get('/tle', async (req: Request, res: Response) => {
  try {
    const { constellation } = req.query;

    let tles;
    if (constellation) {
      tles = await celestrakService.fetchConstellationTles(constellation as string);
    } else {
      tles = await celestrakService.fetchTleData();
    }

    res.json({
      status: 'success',
      data: tles,
      count: tles.length,
      query: constellation ? { constellation } : {},
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch TLE data',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/satellites/constellations
 * Returns metadata for all known constellations with live satellite counts.
 */
router.get('/constellations', async (req: Request, res: Response) => {
  try {
    const constellations = await Promise.all(
      Object.entries(CONSTELLATION_META).map(async ([key, meta]) => {
        // Fetch real TLE count for each constellation (cached, so fast after first call)
        let satelliteCount = 0;
        try {
          const tles = await celestrakService.fetchConstellationTles(key);
          satelliteCount = tles.length;
        } catch {
          // If fetch fails, count stays 0
        }

        return {
          id: key,
          name: meta.name,
          operator: meta.operator,
          purpose: meta.purpose,
          orbitType: meta.orbitType,
          satelliteCount,
          website: meta.website,
        };
      }),
    );

    res.json({
      status: 'success',
      data: constellations,
      count: constellations.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch constellations',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/satellites/constellations/:name
 * Detailed constellation info with full TLE list.
 */
router.get('/constellations/:name', async (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    const key = name.toLowerCase();
    const meta = CONSTELLATION_META[key];

    if (!meta) {
      res.status(404).json({
        status: 'error',
        message: `Constellation "${name}" not found. Available: ${Object.keys(CONSTELLATION_META).join(', ')}`,
      });
      return;
    }

    const tles = await celestrakService.fetchConstellationTles(key);

    res.json({
      status: 'success',
      data: {
        id: key,
        ...meta,
        totalSatellites: tles.length,
        activeSatellites: tles.length, // All returned TLEs are active
        satellites: tles.map((t) => ({
          id: t.satelliteId,
          name: t.satelliteName,
          status: 'active' as const,
        })),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch constellation details',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/satellites/growth
 * Historical growth data by orbit type and constellation, plus aggregated totals.
 * Supports optional ?orbitTypes=leo,meo&operators=SpaceX&functions=internet query filters.
 * (Static data — real historical data is not available via free APIs.)
 */
router.get('/growth', async (req: Request, res: Response) => {
  try {
    /** Per-constellation growth records with orbit type + metadata for filtering. */
    const constellationGrowth: Record<
      string,
      {
        orbitType: string;
        operator: string;
        function: string;
        data: { year: number; totalSatellites: number; activeSatellites: number }[];
      }
    > = {
      /* ── LEO ─────────────────────────────────────────── */
      starlink: {
        orbitType: 'leo',
        operator: 'SpaceX',
        function: 'Internet',
        data: [
          { year: 2019, totalSatellites: 60, activeSatellites: 60 },
          { year: 2020, totalSatellites: 1440, activeSatellites: 1400 },
          { year: 2021, totalSatellites: 1950, activeSatellites: 1900 },
          { year: 2022, totalSatellites: 3271, activeSatellites: 3200 },
          { year: 2023, totalSatellites: 4800, activeSatellites: 4700 },
          { year: 2024, totalSatellites: 6000, activeSatellites: 5500 },
          { year: 2025, totalSatellites: 7000, activeSatellites: 6500 },
        ],
      },
      oneweb: {
        orbitType: 'leo',
        operator: 'Eutelsat OneWeb',
        function: 'Internet',
        data: [
          { year: 2020, totalSatellites: 74, activeSatellites: 74 },
          { year: 2021, totalSatellites: 254, activeSatellites: 250 },
          { year: 2022, totalSatellites: 462, activeSatellites: 450 },
          { year: 2023, totalSatellites: 634, activeSatellites: 620 },
          { year: 2024, totalSatellites: 634, activeSatellites: 610 },
          { year: 2025, totalSatellites: 640, activeSatellites: 615 },
        ],
      },
      iridium: {
        orbitType: 'leo',
        operator: 'Iridium Communications',
        function: 'Communications',
        data: [
          { year: 2017, totalSatellites: 10, activeSatellites: 10 },
          { year: 2018, totalSatellites: 50, activeSatellites: 50 },
          { year: 2019, totalSatellites: 75, activeSatellites: 66 },
          { year: 2020, totalSatellites: 75, activeSatellites: 66 },
          { year: 2021, totalSatellites: 75, activeSatellites: 66 },
          { year: 2022, totalSatellites: 75, activeSatellites: 66 },
          { year: 2023, totalSatellites: 75, activeSatellites: 66 },
          { year: 2024, totalSatellites: 75, activeSatellites: 66 },
          { year: 2025, totalSatellites: 75, activeSatellites: 66 },
        ],
      },
      planet: {
        orbitType: 'leo',
        operator: 'Planet Labs',
        function: 'Earth Observation',
        data: [
          { year: 2017, totalSatellites: 149, activeSatellites: 140 },
          { year: 2018, totalSatellites: 175, activeSatellites: 150 },
          { year: 2019, totalSatellites: 200, activeSatellites: 170 },
          { year: 2020, totalSatellites: 200, activeSatellites: 170 },
          { year: 2021, totalSatellites: 200, activeSatellites: 180 },
          { year: 2022, totalSatellites: 200, activeSatellites: 180 },
          { year: 2023, totalSatellites: 200, activeSatellites: 180 },
          { year: 2024, totalSatellites: 220, activeSatellites: 200 },
          { year: 2025, totalSatellites: 230, activeSatellites: 210 },
        ],
      },
      spire: {
        orbitType: 'leo',
        operator: 'Spire Global',
        function: 'Weather',
        data: [
          { year: 2018, totalSatellites: 50, activeSatellites: 40 },
          { year: 2019, totalSatellites: 80, activeSatellites: 70 },
          { year: 2020, totalSatellites: 100, activeSatellites: 90 },
          { year: 2021, totalSatellites: 110, activeSatellites: 100 },
          { year: 2022, totalSatellites: 120, activeSatellites: 110 },
          { year: 2023, totalSatellites: 150, activeSatellites: 140 },
          { year: 2024, totalSatellites: 175, activeSatellites: 165 },
          { year: 2025, totalSatellites: 180, activeSatellites: 170 },
        ],
      },
      globalstar: {
        orbitType: 'leo',
        operator: 'Globalstar Inc.',
        function: 'Communications',
        data: [
          { year: 2017, totalSatellites: 48, activeSatellites: 40 },
          { year: 2018, totalSatellites: 48, activeSatellites: 40 },
          { year: 2019, totalSatellites: 48, activeSatellites: 40 },
          { year: 2020, totalSatellites: 48, activeSatellites: 40 },
          { year: 2021, totalSatellites: 48, activeSatellites: 40 },
          { year: 2022, totalSatellites: 48, activeSatellites: 40 },
          { year: 2023, totalSatellites: 48, activeSatellites: 40 },
          { year: 2024, totalSatellites: 48, activeSatellites: 40 },
          { year: 2025, totalSatellites: 48, activeSatellites: 40 },
        ],
      },
      /* ── MEO ─────────────────────────────────────────── */
      gps: {
        orbitType: 'meo',
        operator: 'US Space Force',
        function: 'Navigation',
        data: [
          { year: 2017, totalSatellites: 31, activeSatellites: 31 },
          { year: 2018, totalSatellites: 31, activeSatellites: 31 },
          { year: 2019, totalSatellites: 31, activeSatellites: 31 },
          { year: 2020, totalSatellites: 31, activeSatellites: 31 },
          { year: 2021, totalSatellites: 31, activeSatellites: 31 },
          { year: 2022, totalSatellites: 31, activeSatellites: 31 },
          { year: 2023, totalSatellites: 31, activeSatellites: 31 },
          { year: 2024, totalSatellites: 32, activeSatellites: 31 },
          { year: 2025, totalSatellites: 32, activeSatellites: 31 },
        ],
      },
      glonass: {
        orbitType: 'meo',
        operator: 'Roscosmos',
        function: 'Navigation',
        data: [
          { year: 2017, totalSatellites: 26, activeSatellites: 24 },
          { year: 2018, totalSatellites: 26, activeSatellites: 24 },
          { year: 2019, totalSatellites: 27, activeSatellites: 24 },
          { year: 2020, totalSatellites: 27, activeSatellites: 24 },
          { year: 2021, totalSatellites: 27, activeSatellites: 24 },
          { year: 2022, totalSatellites: 26, activeSatellites: 24 },
          { year: 2023, totalSatellites: 26, activeSatellites: 24 },
          { year: 2024, totalSatellites: 26, activeSatellites: 24 },
          { year: 2025, totalSatellites: 27, activeSatellites: 25 },
        ],
      },
      galileo: {
        orbitType: 'meo',
        operator: 'European Space Agency',
        function: 'Navigation',
        data: [
          { year: 2017, totalSatellites: 18, activeSatellites: 15 },
          { year: 2018, totalSatellites: 22, activeSatellites: 18 },
          { year: 2019, totalSatellites: 26, activeSatellites: 22 },
          { year: 2020, totalSatellites: 26, activeSatellites: 22 },
          { year: 2021, totalSatellites: 28, activeSatellites: 24 },
          { year: 2022, totalSatellites: 28, activeSatellites: 24 },
          { year: 2023, totalSatellites: 28, activeSatellites: 24 },
          { year: 2024, totalSatellites: 30, activeSatellites: 28 },
          { year: 2025, totalSatellites: 30, activeSatellites: 28 },
        ],
      },
      beidou: {
        orbitType: 'meo',
        operator: 'CNSA',
        function: 'Navigation',
        data: [
          { year: 2017, totalSatellites: 22, activeSatellites: 18 },
          { year: 2018, totalSatellites: 33, activeSatellites: 30 },
          { year: 2019, totalSatellites: 39, activeSatellites: 35 },
          { year: 2020, totalSatellites: 44, activeSatellites: 40 },
          { year: 2021, totalSatellites: 46, activeSatellites: 42 },
          { year: 2022, totalSatellites: 46, activeSatellites: 42 },
          { year: 2023, totalSatellites: 48, activeSatellites: 44 },
          { year: 2024, totalSatellites: 50, activeSatellites: 46 },
          { year: 2025, totalSatellites: 52, activeSatellites: 48 },
        ],
      },
      /* ── GEO ─────────────────────────────────────────── */
      ses: {
        orbitType: 'geo',
        operator: 'SES S.A.',
        function: 'Communications',
        data: [
          { year: 2017, totalSatellites: 53, activeSatellites: 50 },
          { year: 2018, totalSatellites: 54, activeSatellites: 50 },
          { year: 2019, totalSatellites: 55, activeSatellites: 50 },
          { year: 2020, totalSatellites: 55, activeSatellites: 50 },
          { year: 2021, totalSatellites: 54, activeSatellites: 50 },
          { year: 2022, totalSatellites: 54, activeSatellites: 50 },
          { year: 2023, totalSatellites: 55, activeSatellites: 51 },
          { year: 2024, totalSatellites: 55, activeSatellites: 51 },
          { year: 2025, totalSatellites: 56, activeSatellites: 52 },
        ],
      },
      intelsat: {
        orbitType: 'geo',
        operator: 'Intelsat',
        function: 'Communications',
        data: [
          { year: 2017, totalSatellites: 52, activeSatellites: 50 },
          { year: 2018, totalSatellites: 52, activeSatellites: 50 },
          { year: 2019, totalSatellites: 53, activeSatellites: 50 },
          { year: 2020, totalSatellites: 53, activeSatellites: 50 },
          { year: 2021, totalSatellites: 52, activeSatellites: 48 },
          { year: 2022, totalSatellites: 52, activeSatellites: 48 },
          { year: 2023, totalSatellites: 50, activeSatellites: 46 },
          { year: 2024, totalSatellites: 50, activeSatellites: 46 },
          { year: 2025, totalSatellites: 51, activeSatellites: 47 },
        ],
      },
      eutelsat_geo: {
        orbitType: 'geo',
        operator: 'Eutelsat',
        function: 'Broadcasting',
        data: [
          { year: 2017, totalSatellites: 39, activeSatellites: 37 },
          { year: 2018, totalSatellites: 39, activeSatellites: 37 },
          { year: 2019, totalSatellites: 39, activeSatellites: 36 },
          { year: 2020, totalSatellites: 38, activeSatellites: 36 },
          { year: 2021, totalSatellites: 36, activeSatellites: 34 },
          { year: 2022, totalSatellites: 36, activeSatellites: 34 },
          { year: 2023, totalSatellites: 35, activeSatellites: 33 },
          { year: 2024, totalSatellites: 35, activeSatellites: 33 },
          { year: 2025, totalSatellites: 36, activeSatellites: 34 },
        ],
      },
      /* ── HEO ─────────────────────────────────────────── */
      molniya: {
        orbitType: 'heo',
        operator: 'Roscosmos',
        function: 'Communications',
        data: [
          { year: 2017, totalSatellites: 3, activeSatellites: 2 },
          { year: 2018, totalSatellites: 3, activeSatellites: 2 },
          { year: 2019, totalSatellites: 3, activeSatellites: 2 },
          { year: 2020, totalSatellites: 3, activeSatellites: 2 },
          { year: 2021, totalSatellites: 3, activeSatellites: 2 },
          { year: 2022, totalSatellites: 3, activeSatellites: 2 },
          { year: 2023, totalSatellites: 3, activeSatellites: 2 },
          { year: 2024, totalSatellites: 3, activeSatellites: 2 },
          { year: 2025, totalSatellites: 3, activeSatellites: 2 },
        ],
      },
      tundra: {
        orbitType: 'heo',
        operator: 'Roscosmos',
        function: 'Early Warning',
        data: [
          { year: 2017, totalSatellites: 2, activeSatellites: 2 },
          { year: 2018, totalSatellites: 3, activeSatellites: 3 },
          { year: 2019, totalSatellites: 4, activeSatellites: 4 },
          { year: 2020, totalSatellites: 5, activeSatellites: 5 },
          { year: 2021, totalSatellites: 6, activeSatellites: 6 },
          { year: 2022, totalSatellites: 7, activeSatellites: 7 },
          { year: 2023, totalSatellites: 8, activeSatellites: 8 },
          { year: 2024, totalSatellites: 9, activeSatellites: 9 },
          { year: 2025, totalSatellites: 10, activeSatellites: 10 },
        ],
      },
      sirius_xm: {
        orbitType: 'heo',
        operator: 'SiriusXM',
        function: 'Broadcasting',
        data: [
          { year: 2017, totalSatellites: 5, activeSatellites: 4 },
          { year: 2018, totalSatellites: 5, activeSatellites: 4 },
          { year: 2019, totalSatellites: 5, activeSatellites: 4 },
          { year: 2020, totalSatellites: 6, activeSatellites: 5 },
          { year: 2021, totalSatellites: 6, activeSatellites: 5 },
          { year: 2022, totalSatellites: 7, activeSatellites: 6 },
          { year: 2023, totalSatellites: 7, activeSatellites: 6 },
          { year: 2024, totalSatellites: 7, activeSatellites: 6 },
          { year: 2025, totalSatellites: 8, activeSatellites: 7 },
        ],
      },
    };

    /* ── Apply optional query filters ──────────────────── */
    const orbitTypesParam = req.query.orbitTypes as string | undefined;
    const operatorsParam = req.query.operators as string | undefined;
    const functionsParam = req.query.functions as string | undefined;

    const wantedOrbits = orbitTypesParam ? orbitTypesParam.split(',').map((s) => s.trim().toLowerCase()) : null;
    const wantedOperators = operatorsParam ? operatorsParam.split(',').map((s) => s.trim().toLowerCase()) : null;
    const wantedFunctions = functionsParam ? functionsParam.split(',').map((s) => s.trim().toLowerCase()) : null;

    const filtered: typeof constellationGrowth = {};
    for (const [key, entry] of Object.entries(constellationGrowth)) {
      if (wantedOrbits && !wantedOrbits.includes(entry.orbitType)) continue;
      if (wantedOperators && !wantedOperators.some((w) => entry.operator.toLowerCase().includes(w))) continue;
      if (wantedFunctions && !wantedFunctions.some((w) => entry.function.toLowerCase().includes(w))) continue;
      filtered[key] = entry;
    }

    /* ── Aggregate by orbit type per year ──────────────── */
    const yearMap: Record<number, { leo: number; meo: number; geo: number; heo: number; total: number }> = {};
    for (const entry of Object.values(filtered)) {
      for (const row of entry.data) {
        if (!yearMap[row.year]) {
          yearMap[row.year] = { leo: 0, meo: 0, geo: 0, heo: 0, total: 0 };
        }
        const orbit = entry.orbitType as 'leo' | 'meo' | 'geo' | 'heo';
        yearMap[row.year][orbit] += row.activeSatellites;
        yearMap[row.year].total += row.activeSatellites;
      }
    }

    const aggregated = Object.entries(yearMap)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([year, counts]) => ({
        timestamp: `${year}-01-01`,
        year: Number(year),
        ...counts,
      }));

    /* ── Collect unique filter options for the frontend ── */
    const allOperators = [...new Set(Object.values(constellationGrowth).map((e) => e.operator))].sort();
    const allFunctions = [...new Set(Object.values(constellationGrowth).map((e) => e.function))].sort();

    res.json({
      status: 'success',
      data: {
        aggregated,
        constellations: filtered,
        filterOptions: {
          orbitTypes: ['leo', 'meo', 'geo', 'heo'],
          operators: allOperators,
          functions: allFunctions,
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch growth data',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/satellites/:id/position
 * Current position of a specific satellite via server-side propagation.
 */
router.get('/:id/position', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const position = await celestrakService.fetchSatellitePosition(id, new Date());

    if (!position) {
      res.status(404).json({
        status: 'error',
        message: `Satellite ${id} not found`,
      });
      return;
    }

    res.json({
      status: 'success',
      data: {
        satelliteId: id,
        ...position,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch satellite position',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
