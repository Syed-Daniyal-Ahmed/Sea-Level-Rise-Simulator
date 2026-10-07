'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';

const GRID_SIZE = 20;
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
  const [lockedBounds, setLockedBounds] = useState(null);
  const [gridCells, setGridCells] = useState([]);
  const [elevationGrid, setElevationGrid] = useState(null);
  const [isLoadingElevations, setIsLoadingElevations] = useState(false);
  const [elevationError, setElevationError] = useState('');
  const [seaLevelRise, setSeaLevelRise] = useState(0);
  const [seaLevelMode, setSeaLevelMode] = useState('manual');
  const [temperatureRise, setTemperatureRise] = useState(0);

  async function fetchElevations() {
    if (!lockedBounds || isLoadingElevations) return;

    const latitudeStep = (lockedBounds.north - lockedBounds.south) / GRID_SIZE;
    const longitudeStep = (lockedBounds.east - lockedBounds.west) / GRID_SIZE;
    const cells = [];

    for (let row = 0; row < GRID_SIZE; row += 1) {
      for (let column = 0; column < GRID_SIZE; column += 1) {
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

    setGridCells(cells);
    setElevationGrid(null);
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
      const grid = Array.from({ length: GRID_SIZE }, (_, row) =>
        populatedCells
          .filter((cell) => cell.row === row)
          .map((cell) => cell.elevation),
      );

      setGridCells(populatedCells);
      setElevationGrid(grid);
    } catch (error) {
      setElevationError(error.message || 'Unable to load elevation data.');
    } finally {
      setIsLoadingElevations(false);
    }
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
              setLockedBounds(bounds);
              if (bounds) {
                setGridCells([]);
                setElevationGrid(null);
                setElevationError('');
                setSeaLevelRise(0);
              }
            }}
            samplePoints={gridCells}
            seaLevelRise={elevationGrid ? activeSeaLevelRise : null}
          />
        </section>

        {lockedBounds && (
          <section className="elevation-panel" aria-live="polite">
            <button
              type="button"
              className="elevation-button"
              onClick={fetchElevations}
              disabled={isLoadingElevations}
            >
              {isLoadingElevations ? 'Fetching elevations...' : 'Fetch Elevation'}
            </button>
            {elevationError && <p className="elevation-error" role="alert">{elevationError}</p>}
            {elevationGrid && (
              <div className="elevation-results">
                <p><strong>Elevation data loaded</strong></p>
                <p>Grid: {GRID_SIZE} × {GRID_SIZE}</p>
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
