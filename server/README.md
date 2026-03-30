# SpacePulse Server

Real-time space activity monitoring dashboard backend.

## Project Structure

```
server/
├── src/
│   ├── config/              # Configuration management
│   │   └── index.ts        # Centralized config from environment
│   ├── middleware/          # Express middleware
│   │   ├── rateLimiter.ts  # Rate limiting (stub)
│   │   └── errorHandler.ts # Global error handling
│   ├── routes/              # API route definitions
│   │   ├── index.ts        # Route aggregator
│   │   ├── launches.ts     # Launches endpoints
│   │   ├── satellites.ts   # Satellites/TLE endpoints
│   │   ├── weather.ts      # Space weather endpoints
│   │   └── investments.ts  # Investment data endpoints
│   ├── services/            # Business logic & API integrations
│   │   ├── launches.service.ts      # Launch data fetching
│   │   ├── celestrak.service.ts     # TLE data from Celestrak
│   │   ├── spacex.service.ts        # SpaceX-specific APIs
│   │   ├── weather.service.ts       # NOAA space weather data
│   │   ├── investments.service.ts   # Funding/investment data
│   │   └── czml.service.ts          # CZML visualization generation
│   ├── types/               # TypeScript interfaces
│   │   ├── launch.ts       # Launch data structures
│   │   ├── satellite.ts    # Satellite/TLE structures
│   │   ├── weather.ts      # Weather data structures
│   │   ├── czml.ts         # CZML document structures
│   │   └── investment.ts   # Investment data structures
│   ├── cache/               # Caching layer
│   │   ├── index.ts        # Cache abstraction (Redis/fallback)
│   │   └── memoryCache.ts  # In-memory TTL cache
│   ├── websocket/           # Socket.io real-time updates
│   │   ├── index.ts        # WebSocket setup
│   │   └── handlers.ts     # Event handlers for namespaces
│   ├── jobs/                # Polling & scheduled jobs
│   │   ├── scheduler.ts    # Job scheduler (node-cron)
│   │   ├── pollLaunches.ts # Launch polling job
│   │   ├── pollTle.ts      # TLE polling job
│   │   └── pollWeather.ts  # Weather polling job
│   └── index.ts            # Main entry point
├── package.json            # Dependencies
├── tsconfig.json           # TypeScript configuration
├── .env.example            # Environment variable template
└── README.md               # This file
```

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Real-time**: Socket.io
- **Caching**: Redis (with in-memory fallback)
- **Scheduling**: node-cron
- **HTTP Client**: axios

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file from template:
```bash
cp .env.example .env
```

3. Configure environment variables in `.env`

## Running

### Development
```bash
npm run dev
```

### Production
```bash
npm run build
npm start
```

## API Endpoints

### Launches
- `GET /api/launches` - Get all upcoming launches
- `GET /api/launches/:id` - Get launch details
- `GET /api/launches/recent` - Get recent launches
- `GET /api/launches/summary` - Get launch summary

### Satellites
- `GET /api/satellites/tle` - Get TLE data
- `GET /api/satellites/constellations` - Get all constellations
- `GET /api/satellites/constellations/:name` - Get constellation details
- `GET /api/satellites/growth` - Get constellation growth data
- `GET /api/satellites/:id/position` - Get satellite position

### Space Weather
- `GET /api/weather/solar-wind` - Get solar wind data
- `GET /api/weather/kp-index` - Get geomagnetic activity
- `GET /api/weather/xray` - Get X-ray flux
- `GET /api/weather/current` - Get all weather data
- `GET /api/weather/alerts` - Get weather alerts

### Investments
- `GET /api/investments/funding` - Get recent funding rounds
- `GET /api/investments/events` - Get investment events
- `GET /api/investments/companies/:name` - Get company profile
- `GET /api/investments/trends` - Get funding trends

## WebSocket Namespaces

- `/launches` - Real-time launch updates
  - `subscribe_launches` - Subscribe to launch updates
  - `launches_update` - Emitted when launches change

- `/satellites` - Real-time satellite data
  - `subscribe_satellite` - Subscribe to satellite position
  - `subscribe_constellation` - Subscribe to constellation updates
  - `satellite_position` - Emitted with position updates

- `/weather` - Real-time space weather
  - `subscribe_weather` - Subscribe to weather updates
  - `subscribe_alerts` - Subscribe to weather alerts
  - `weather_update` - Emitted when weather data changes
  - `weather_alert` - Emitted for new alerts

## Polling Jobs

Jobs run on configured intervals via node-cron:

- **pollLaunches**: Every 60 seconds
  - Fetches upcoming/recent launches
  - Broadcasts via `/launches` namespace

- **pollTle**: Every 30 minutes
  - Fetches satellite TLE data
  - Broadcasts via `/satellites` namespace

- **pollWeather**: Every 60 seconds
  - Fetches space weather data
  - Broadcasts via `/weather` namespace

## Implementation Status

This is a **scaffold with stub implementations**. Each service, route, and job contains:

- Complete TypeScript types and interfaces
- Function signatures
- TODO comments describing what needs to be implemented
- Mock data for development
- Proper error handling structure

## TODO Items

### Services
- [ ] Implement actual API calls to external data sources
- [ ] Add request caching with appropriate TTLs
- [ ] Implement error recovery and fallback strategies
- [ ] Add data validation and normalization

### WebSocket
- [ ] Implement client subscription management
- [ ] Add room-based broadcasting for efficiency
- [ ] Implement authentication/authorization
- [ ] Add subscription persistence

### Jobs
- [ ] Implement change detection for incremental updates
- [ ] Add job result logging and monitoring
- [ ] Implement retry logic for failed jobs
- [ ] Add health checks for job execution

### Features
- [ ] Add request validation middleware
- [ ] Implement pagination for large datasets
- [ ] Add query parameter support for filtering/sorting
- [ ] Add structured logging
- [ ] Add metrics and monitoring
- [ ] Add API authentication
- [ ] Add database models if needed

## External APIs

Configure these endpoints in `.env`:

- **Celestrak**: TLE data
  - Default: `https://celestrak.org`

- **SpaceX API**: Launch and Starlink data
  - Default: `https://api.spacexdata.com/v4`

- **NOAA SWPC**: Space weather data
  - Default: `https://services.swpc.noaa.gov`

- **RocketLaunch.Live**: Launch schedule
  - Default: `https://fdo.rocketlaunch.live/json/launches/next/10`

## Notes

- All stub implementations return mock data
- Redis cache is optional; in-memory cache is used as fallback
- Error handling is implemented but needs integration with monitoring service
- Rate limiting is a simple in-memory implementation for development
