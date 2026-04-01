import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server config
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  // Redis config
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',

  // External APIs
  celestrakBaseUrl: process.env.CELESTRAK_BASE_URL || 'https://celestrak.org',
  spacexApiUrl: process.env.SPACEX_API_URL || 'https://api.spacexdata.com/v4',
  noaaSwpcUrl: process.env.NOAA_SWPC_URL || 'https://services.swpc.noaa.gov',
  tleApiUrl: process.env.TLE_API_URL || 'https://tle.ivanstanojevic.me/api/tle',
  rocketLaunchLiveUrl: process.env.ROCKETLAUNCH_LIVE_URL || 'https://fdo.rocketlaunch.live/json/launches',

  // YouTube Data API v3 (free tier: 10k units/day)
  youtubeApiKey: process.env.YOUTUBE_API_KEY || '',

  // Polling intervals (in seconds)
  pollLaunchesInterval: 60,      // Launch schedule changes infrequently
  pollTleInterval: 1800,         // 30 minutes — TLE updates are batched by Celestrak
  pollWeatherInterval: 60,       // Space weather is fast-changing

  // Cache TTLs (in seconds) — tuned per data source volatility
  cacheTtlLaunches: 300,         // 5 min  — launch schedules change slowly
  cacheTtlTle: 3600,             // 1 hour — TLE orbital elements drift slowly
  cacheTtlSolarWind: 120,        // 2 min  — solar wind is real-time plasma data
  cacheTtlKpIndex: 180,          // 3 min  — Kp is updated every 3 hours but we want freshness
  cacheTtlXrayFlux: 120,         // 2 min  — X-ray flux changes with solar flares
  cacheTtlAlerts: 60,            // 1 min  — alerts must be fresh
  cacheTtlWeather: 120,          // 2 min  — general weather fallback TTL
  cacheTtlInvestments: 3600,     // 1 hour — investment data is static/mock
  cacheTtlConstellations: 86400, // 24 hrs — constellation metadata rarely changes

  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',
};

export default config;
