# Sea Level Rise Simulator

A lightweight interactive web app built with Next.js to visualize how a region may become submerged under different sea-level scenarios.

The app lets you:

- Explore a world map with Leaflet
- Lock a viewport to a chosen area
- Fetch elevation data for that area from the Google Elevation API
- Compare manual sea-level rise with temperature-driven estimates
- See submerged cells and percentage coverage in real time

## Live Demo

Run locally in development mode, then open http://localhost:3000.

## Features

- Interactive map navigation and click-to-inspect coordinates
- Viewport locking for focused region analysis
- Grid-based elevation sampling with 20x20 or 40x40 resolution options
- Real elevation data via Google Elevation API
- Sea-level simulation using either:
  - manual slider input
  - temperature rise estimation
- Visual overlay showing submerged areas and coastal extent
- Summary metrics for covered cells and elevation ranges

## Tech Stack

- Next.js 16
- React 19
- Leaflet + react-leaflet
- Google Elevation API
- ESLint

## Project Structure

```text
my-app/
├── app/
│   ├── api/
│   │   └── elevation/
│   │       └── route.js
│   ├── components/
│   │   └── Map.js
│   ├── globals.css
│   ├── layout.js
│   └── page.js
├── public/
│   └── simulator.html
├── .gitignore
├── eslint.config.mjs
├── jsconfig.json
├── next.config.mjs
├── package.json
├── postcss.config.mjs
├── README.md
└── ...
```

## Prerequisites

Before running the project, make sure you have:

- Node.js 18+ or newer
- npm
- A Google Cloud project with the Elevation API enabled
- A valid Google Elevation API key

## Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Create a local environment file:

```bash
copy NUL .env.local
```

Then add your API key:

```env
GOOGLE_ELEVATION_API_KEY=your_google_elevation_api_key_here
```

> If you do not provide this key, the app will not be able to fetch elevation data.

## Run the App

```bash
npm run dev
```

Then open:

```text
http://localhost:3000
```

## How to Use

1. Navigate the map and zoom to the region you want to study.
2. Click the Lock viewport button to freeze the current map bounds.
3. Select a grid resolution (20x20 or 40x40).
4. Click Fetch Elevation to retrieve terrain data for the selected region.
5. Adjust the sea-level slider or temperature-rise control.
6. Observe which cells are submerged and the percentage of the sampled area impacted.

## Important Notes

- The project uses Google Elevation API to collect surface heights.
- You must enable the Elevation API in Google Cloud Console and keep the key secure.
- The app currently supports a simple visual simulation and is intended for educational or exploratory use rather than precise engineering modeling.

## Scripts

```bash
npm run dev     # Start development server
npm run build   # Create production build
npm run start   # Start production server
npm run lint    # Run ESLint checks
```

## Main Implementation Files

- [app/page.js](app/page.js) — UI logic, elevation fetching, and sea-level calculations
- [app/components/Map.js](app/components/Map.js) — Leaflet map rendering and submerged area overlays
- [app/api/elevation/route.js](app/api/elevation/route.js) — API route that proxies requests to Google Elevation API

## Contributing

Contributions are welcome. If you improve the simulator, add extra climate scenarios, or add better map styling, feel free to fork the project.
