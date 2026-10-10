'use client';

import dynamic from 'next/dynamic';
import { useRef, useState } from 'react';

const GRID_RESOLUTIONS = [20, 40];
const SEA_LEVEL_RISE_COEFFICIENT = 2.4;

const Map = dynamic(() => import('./components/Map'), {
  ssr: false,
  loading: () => <div className="map-shell"><div className="map-frame" /></div>,
});

export default function Home() {
  const [selectedLocation, setSelectedLocation] = useState({
    lat: null,
    lng: null,
  });
  const [gridResolution, setGridResolution] = useState(20);
  const [lockedBounds, setLockedBounds] = useState(null);
  const [gridCells, setGridCells] = useState([]);
  const [elevationGrid, setElevationGrid] = useState(null);
  const [loadedGridResolution, setLoadedGridResolution] = useState(null);
  const [isLoadingElevations, setIsLoadingElevations] = useState(false);
  const [elevationError, setElevationError] = useState('');
  const [seaLevelRise, setSeaLevelRise] = useState(0);
  const [seaLevelMode, setSeaLevelMode] = useState('manual');
  const [temperatureRise, setTemperatureRise] = useState(0);
  const requestInFlight = useRef(false);
  const elevationRequestId = useRef(0);
  const samplePointCount = gridResolution * gridResolution;

  async function fetchElevations() {
    if (!lockedBounds || requestInFlight.current) return;

    const requestId = ++elevationRequestId.current;
    const latitudeStep = (lockedBounds.north - lockedBounds.south) / gridResolution;
    const longitudeStep = (lockedBounds.east - lockedBounds.west) / gridResolution;
    const cells = [];

    for (let row = 0; row < gridResolution; row += 1) {
      for (let column = 0; column < gridResolution; column += 1) {
        cells.push({
          row,
          column,
          south: lockedBounds.south + row * latitudeStep,
          north: lockedBounds.south + (row + 1) * latitudeStep,
          west: lockedBounds.west + column * longitudeStep,
          east: lockedBounds.west + (column + 1) * longitudeStep,
          lat: lockedBounds.south + (row + 0.5) * latitudeStep,
          lng: lockedBounds.west + (column + 0.5) * longitudeStep,
        });
      }
    }

    requestInFlight.current = true;
    setGridCells([]);
    setElevationGrid(null);
    setLoadedGridResolution(null);
    setElevationError('');
    setSeaLevelRise(0);
    setIsLoadingElevations(true);

    try {
      const response = await fetch('/api/elevation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locations: cells.map(({ lat, lng }) => ({ lat, lng })) }),
      });
      const data = await response.json();
      if (requestId !== elevationRequestId.current) return;

      if (!response.ok) {
        const details = data.details ? ` ${data.details}` : '';
        throw new Error(`${data.error || 'Elevation request failed.'}${details}`);
      }
      if (!Array.isArray(data.results) || data.results.length !== cells.length) {
        throw new Error('The elevation service returned an unexpected number of results.');
      }

      const populatedCells = cells.map((cell, index) => ({
        ...cell,
        elevation: data.results[index].elevation,
      }));
      const grid = Array.from({ length: gridResolution }, (_, row) =>
        populatedCells
          .filter((cell) => cell.row === row)
          .map((cell) => cell.elevation),
      );

      setGridCells(populatedCells);
      setElevationGrid(grid);
      setLoadedGridResolution(gridResolution);
    } catch (error) {
      if (requestId === elevationRequestId.current) {
        setElevationError(error.message || 'Unable to load elevation data.');
      }
    } finally {
      if (requestId === elevationRequestId.current) {
        requestInFlight.current = false;
        setIsLoadingElevations(false);
      }
    }
  }

  function handleGridResolutionChange(event) {
    const nextResolution = Number(event.target.value);
    if (!GRID_RESOLUTIONS.includes(nextResolution)) return;
    setGridResolution(nextResolution);
    setGridCells([]);
    setElevationGrid(null);
    setLoadedGridResolution(null);
    setElevationError('');
    setSeaLevelRise(0);
  }

  const elevations = elevationGrid?.flat() ?? [];
  const minimumElevation = elevations.length ? Math.min(...elevations) : null;
  const maximumElevation = elevations.length ? Math.max(...elevations) : null;
  const thermalSeaLevelRise = SEA_LEVEL_RISE_COEFFICIENT * temperatureRise;
  const activeSeaLevelRise = seaLevelMode === 'temperature'
    ? thermalSeaLevelRise
    : seaLevelRise;
  const submergedCells = gridCells.filter(
    (cell) => Number.isFinite(cell.elevation) && cell.elevation <= activeSeaLevelRise,
  );
  const submergedPercentage = gridCells.length
    ? (submergedCells.length / gridCells.length) * 100
    : 0;

  return (
    <main className="page-shell">
      <div className="panel">
        <header className="panel-header">
          <h1>🌊 Sea Level Rise Simulator</h1>
        </header>

        <section className="map-section">
          <div className="map-heading">INTERACTIVE MAP</div>
          <p className="map-subtitle">Pan / Zoom / Click</p>
          <Map
            center={[20, 0]}
            zoom={2}
            onLocationChange={setSelectedLocation}
            onViewportLockChange={(bounds) => {
              elevationRequestId.current += 1;
              requestInFlight.current = false;
              setIsLoadingElevations(false);
              setLockedBounds(bounds);
              setGridCells([]);
              setElevationGrid(null);
              setLoadedGridResolution(null);
              setElevationError('');
              setSeaLevelRise(0);
            }}
            samplePoints={gridCells}
            seaLevelRise={loadedGridResolution === gridResolution ? activeSeaLevelRise : null}
          />
        </section>

        {lockedBounds && (
          <section className="elevation-panel" aria-live="polite">
            <div className="grid-resolution-control">
              <label htmlFor="grid-resolution">Grid resolution</label>
              <select
                id="grid-resolution"
                value={gridResolution}
                onChange={handleGridResolutionChange}
                disabled={isLoadingElevations}
              >
                <option value={20}>20 × 20 · faster</option>
                <option value={40}>40 × 40 · finer detail</option>
              </select>
              <p>{gridResolution} × {gridResolution} grid · {samplePointCount.toLocaleString()} elevation points</p>
            </div>
            <button
              type="button"
              className="elevation-button"
              onClick={fetchElevations}
              disabled={isLoadingElevations}
            >
              {isLoadingElevations ? 'Fetching elevations...' : 'Fetch Elevation'}
            </button>
            {elevationError && <p className="elevation-error" role="alert">{elevationError}</p>}
            {loadedGridResolution === gridResolution && elevationGrid && (
              <div className="elevation-results">
                <p><strong>Elevation data loaded</strong></p>
                <p>Grid: {loadedGridResolution} × {loadedGridResolution}</p>
                <p>Sample points: {gridCells.length}</p>
                <p>Minimum: {minimumElevation.toFixed(2)} m · Maximum: {maximumElevation.toFixed(2)} m</p>
                <div className="sea-level-control">
                  <fieldset className="sea-level-mode">
                    <legend>Sea-level mode</legend>
                    <label>
                      <input
                        type="radio"
                        name="sea-level-mode"
                        value="manual"
                        checked={seaLevelMode === 'manual'}
                        onChange={() => setSeaLevelMode('manual')}
                      />
                      Manual Sea Level
                    </label>
                    <label>
                      <input
                        type="radio"
                        name="sea-level-mode"
                        value="temperature"
                        checked={seaLevelMode === 'temperature'}
                        onChange={() => setSeaLevelMode('temperature')}
                      />
                      Temperature Rise
                    </label>
                  </fieldset>

                  {seaLevelMode === 'manual' ? (
                    <div className="sea-level-range-control">
                      <label htmlFor="sea-level-rise">Manual Sea Level</label>
                      <div className="sea-level-range">
                        <span>0.0 m</span>
                        <input
                          id="sea-level-rise"
                          type="range"
                          min="0"
                          max="450"
                          step="3"
                          value={seaLevelRise}
                          onChange={(event) => setSeaLevelRise(Number(event.target.value))}
                        />
                        <span>450.0 m</span>
                      </div>
                    </div>
                  ) : (
                    <div className="sea-level-range-control">
                      <label htmlFor="temperature-rise">Temperature Rise</label>
                      <div className="sea-level-range">
                        <span>0.0°C</span>
                        <input
                          id="temperature-rise"
                          type="range"
                          min="0"
                          max="5"
                          step="0.1"
                          value={temperatureRise}
                          onChange={(event) => setTemperatureRise(Number(event.target.value))}
                        />
                        <span>5.0°C</span>
                      </div>
                      <p>Temperature Rise: {temperatureRise.toFixed(1)}°C</p>
                      <p>Estimated Sea Level Rise: {thermalSeaLevelRise.toFixed(1)} m</p>
                    </div>
                  )}
                  <p className="current-sea-level-rise">
                    Current rise: {activeSeaLevelRise.toFixed(1)} m
                  </p>
                </div>
                <div className="sea-level-statistics">
                  <p>Submerged cells: {submergedCells.length} / {gridCells.length}</p>
                  <p>Coverage submerged: {submergedPercentage.toFixed(2)}%</p>
                  <p>Minimum elevation: {minimumElevation.toFixed(2)} m</p>
                  <p>Maximum elevation: {maximumElevation.toFixed(2)} m</p>
                </div>
              </div>
            )}
          </section>
        )}

        <div className="coordinates-panel">
          <p>Clicked coordinates:</p>
          <p>Latitude: {selectedLocation.lat !== null ? selectedLocation.lat.toFixed(4) : '—'}</p>
          <p>Longitude: {selectedLocation.lng !== null ? selectedLocation.lng.toFixed(4) : '—'}</p>
        </div>
      </div>
    </main>
  );
}
