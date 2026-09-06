'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
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

function ViewportLock({ locked }) {
  const map = useMap();

  useEffect(() => {
    map.dragging[locked ? 'disable' : 'enable']();
    map.touchZoom[locked ? 'disable' : 'enable']();
    map.doubleClickZoom[locked ? 'disable' : 'enable']();
    map.scrollWheelZoom[locked ? 'disable' : 'enable']();
    map.boxZoom[locked ? 'disable' : 'enable']();
    map.keyboard[locked ? 'disable' : 'enable']();
  }, [locked, map]);

  return null;
}

export default function Map({ center = [20, 0], zoom = 2, onLocationChange }) {
  const [isViewportLocked, setIsViewportLocked] = useState(false);

  return (
    <div className="map-shell">
      <button
        type="button"
        className="viewport-lock-button"
        aria-pressed={isViewportLocked}
        onClick={() => setIsViewportLocked((locked) => !locked)}
      >
        {isViewportLocked ? 'Unlock viewport' : 'Lock viewport'}
      </button>
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
        <ViewportLock locked={isViewportLocked} />
        <MapClickHandler onLocationChange={onLocationChange} />
      </MapContainer>
    </div>
  );
}
