'use client';

import { useEffect, useRef, useState } from 'react';
import { CircleMarker, MapContainer, Polyline, Rectangle, TileLayer, useMap, useMapEvents } from 'react-leaflet';
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
  submergedCells = [],
}) {
  const [isViewportLocked, setIsViewportLocked] = useState(false);
  const mapRef = useRef(null);
  const cellsByIndex = Object.create(null);
  const submergedByIndex = Object.create(null);

  samplePoints.forEach((point) => {
    cellsByIndex[`${point.row}:${point.column}`] = point;
  });
  submergedCells.forEach((point) => {
    submergedByIndex[`${point.row}:${point.column}`] = true;
  });

  const gridEdges = [];
  if (seaLevelRise !== null && samplePoints.length) {
    const maxRow = Math.max(...samplePoints.map(({ row }) => row));
    const maxColumn = Math.max(...samplePoints.map(({ column }) => column));

    samplePoints.forEach((point) => {
      const key = `${point.row}:${point.column}`;
      const isSubmerged = Boolean(submergedByIndex[key]);
      const aboveKey = `${point.row - 1}:${point.column}`;
      const leftKey = `${point.row}:${point.column - 1}`;

      if (!cellsByIndex[aboveKey] || !(isSubmerged && submergedByIndex[aboveKey])) {
        gridEdges.push({
          key: `top-${key}`,
          positions: [[point.north, point.west], [point.north, point.east]],
        });
      }
      if (!cellsByIndex[leftKey] || !(isSubmerged && submergedByIndex[leftKey])) {
        gridEdges.push({
          key: `left-${key}`,
          positions: [[point.south, point.west], [point.north, point.west]],
        });
      }
      if (point.row === maxRow) {
        gridEdges.push({
          key: `bottom-${key}`,
          positions: [[point.south, point.west], [point.south, point.east]],
        });
      }
      if (point.column === maxColumn) {
        gridEdges.push({
          key: `right-${key}`,
          positions: [[point.south, point.east], [point.north, point.east]],
        });
      }
    });
  }

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
        {seaLevelRise !== null && submergedCells
          .map((point) => (
            <Rectangle
              key={`submerged-${point.row}-${point.column}`}
              bounds={[[point.south, point.west], [point.north, point.east]]}
              pathOptions={{
                stroke: false,
                fillColor: '#27689d',
                fillOpacity: 0.44,
              }}
              interactive={false}
            />
          ))}
        {gridEdges.map((edge) => (
          <Polyline
            key={edge.key}
            positions={edge.positions}
            pathOptions={{ color: '#315f87', weight: 1, opacity: 0.42 }}
            interactive={false}
          />
        ))}
        {samplePoints.map((point) => (
          <CircleMarker
            key={`${point.row}-${point.column}`}
            center={[point.lat, point.lng]}
            radius={2}
            pathOptions={{ color: '#b42318', fillColor: '#f04438', fillOpacity: 0.9, weight: 1 }}
            interactive={false}
          />
        ))}
      </MapContainer>
    </div>
  );
}
