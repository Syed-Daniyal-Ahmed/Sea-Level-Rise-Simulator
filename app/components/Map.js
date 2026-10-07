'use client';

import { useEffect, useRef, useState } from 'react';
import { CircleMarker, MapContainer, Rectangle, TileLayer, useMap, useMapEvents } from 'react-leaflet';
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

function MapInstance({ mapRef }) {
  const map = useMap();

  useEffect(() => {
    mapRef.current = map;
    return () => {
      mapRef.current = null;
    };
  }, [map, mapRef]);

  return null;
}

export default function Map({
  center = [20, 0],
  zoom = 2,
  onLocationChange,
  onViewportLockChange,
  samplePoints = [],
  seaLevelRise = null,
}) {
  const [isViewportLocked, setIsViewportLocked] = useState(false);
  const mapRef = useRef(null);

  function handleLockChange(bounds) {
    setIsViewportLocked(Boolean(bounds));
    onViewportLockChange(bounds ? {
      south: bounds.getSouth(),
      west: bounds.getWest(),
      north: bounds.getNorth(),
      east: bounds.getEast(),
    } : null);
  }

  function toggleViewportLock() {
    const bounds = isViewportLocked ? null : mapRef.current?.getBounds();
    if (!isViewportLocked && !bounds) return;
    handleLockChange(bounds);
  }

  return (
    <div className="map-shell">
      <button
        type="button"
        className="viewport-lock-button"
        aria-pressed={isViewportLocked}
        onClick={toggleViewportLock}
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
        <MapInstance mapRef={mapRef} />
        <MapClickHandler onLocationChange={onLocationChange} />
        {seaLevelRise !== null && samplePoints
          .filter((point) => Number.isFinite(point.elevation) && point.elevation <= seaLevelRise)
          .map((point) => (
            <Rectangle
              key={`submerged-${point.row}-${point.column}`}
              bounds={[[point.south, point.west], [point.north, point.east]]}
              pathOptions={{
                color: '#0369a1',
                weight: 1,
                opacity: 0.9,
                fillColor: '#38bdf8',
                fillOpacity: 0.48,
              }}
              interactive={false}
            />
          ))}
        {samplePoints.map((point) => (
          <CircleMarker
            key={`${point.row}-${point.column}`}
            center={[point.lat, point.lng]}
            radius={3}
            pathOptions={{ color: '#b42318', fillColor: '#f04438', fillOpacity: 0.9, weight: 1 }}
            interactive={false}
          />
        ))}
      </MapContainer>
    </div>
  );
}
