'use client';

import { MapContainer, TileLayer, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

function MapClickHandler({ onLocationChange }) {
  useMapEvents({
    click(event) {
      const { lat, lng } = event.latlng;
      onLocationChange({ lat, lng });
    },
  });

  return null;
}

export default function Map({ center = [20, 0], zoom = 2, onLocationChange }) {
  return (
    <div className="map-shell">
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom
        zoomControl
        className="map-frame"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapClickHandler onLocationChange={onLocationChange} />
      </MapContainer>
    </div>
  );
}
