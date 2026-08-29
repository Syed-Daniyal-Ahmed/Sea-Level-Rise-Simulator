'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';

const Map = dynamic(() => import('./components/Map'), {
  ssr: false,
  loading: () => <div className="map-shell"><div className="map-frame" /></div>,
});

export default function Home() {
  const [selectedLocation, setSelectedLocation] = useState({
    lat: null,
    lng: null,
  });

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
          />
        </section>

        <div className="coordinates-panel">
          <p>Clicked coordinates:</p>
          <p>Latitude: {selectedLocation.lat !== null ? selectedLocation.lat.toFixed(4) : '—'}</p>
          <p>Longitude: {selectedLocation.lng !== null ? selectedLocation.lng.toFixed(4) : '—'}</p>
        </div>
      </div>
    </main>
  );
}
