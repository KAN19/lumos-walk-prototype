import React, { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import { LODZ_CENTER } from '../data/sunnySpotsLodz';
import { spotsToGeoJson } from '../utils/geoUtils';
import { Compass, Sun, Crosshair, MapPin, AlertTriangle } from 'lucide-react';

export default function MapComponent({
  spots,
  windowsBySpotId,
  selectedSpot,
  userLocation,
  onSetUserLocation,
  onSelectSpot,
  onLocateMe,
  solarPos,
  activeSession,
  sessionGeofence,
  onOpenSessionModal,
  onTeleportToSpot,
  onStepOutsideSpot
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef({});
  const userMarkerRef = useRef(null);

  const [isSimulatingGps, setIsSimulatingGps] = useState(false);
  const isSimulatingGpsRef = useRef(false);

  useEffect(() => {
    isSimulatingGpsRef.current = isSimulatingGps;
    if (mapRef.current) {
      mapRef.current.getCanvas().style.cursor = isSimulatingGps ? 'crosshair' : '';
    }
  }, [isSimulatingGps]);

  // Generates a dynamic GeoJSON line representing the incoming solar ray vector towards the selected spot
  const getSunBeamGeoJson = useCallback(() => {
    if (!selectedSpot || !selectedSpot.coordinates) {
      return { type: 'FeatureCollection', features: [] };
    }
    const [cx, cy] = selectedSpot.coordinates;
    const metersPerDegLat = 111320;
    const metersPerDegLng = 111320 * Math.cos((cy * Math.PI) / 180);

    const azRad = (solarPos.azimuthDeg * Math.PI) / 180;
    const rayLengthMeters = 180;
    const sunOriginX = cx - (rayLengthMeters * Math.sin(azRad)) / metersPerDegLng;
    const sunOriginY = cy - (rayLengthMeters * Math.cos(azRad)) / metersPerDegLat;

    return {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [
              [sunOriginX, sunOriginY],
              [cx, cy]
            ]
          },
          properties: {
            label: `Solar Beam (${solarPos.azimuthDeg}°)`
          }
        }
      ]
    };
  }, [selectedSpot, solarPos]);

  // Helper to add or update polygon GeoJSON layers
  const syncAreaLayers = useCallback((map) => {
    if (!map || !map.isStyleLoaded()) return;

    // Only generates polygon for the selected spot when clicked
    const geoJsonData = spotsToGeoJson(spots, windowsBySpotId, selectedSpot?.id);
    const existingSource = map.getSource('sunny-areas-source');

    if (!existingSource) {
      map.addSource('sunny-areas-source', {
        type: 'geojson',
        data: geoJsonData
      });

      // Layer 1: Radiant polygon fill (shows only for clicked icon)
      map.addLayer({
        id: 'sunny-areas-fill',
        type: 'fill',
        source: 'sunny-areas-source',
        paint: {
          'fill-color': '#f59e0b',
          'fill-opacity': 0.62
        }
      });

      // Layer 2: Glowing outline border
      map.addLayer({
        id: 'sunny-areas-stroke',
        type: 'line',
        source: 'sunny-areas-source',
        paint: {
          'line-color': '#ffffff',
          'line-width': 4
        }
      });

      // Source & Layer for incoming Sun Beam Vector
      map.addSource('sun-beam-source', {
        type: 'geojson',
        data: getSunBeamGeoJson()
      });

      map.addLayer({
        id: 'sun-beam-line',
        type: 'line',
        source: 'sun-beam-source',
        paint: {
          'line-color': '#fbbf24',
          'line-width': 2.5,
          'line-dasharray': [3, 2]
        }
      });
    } else {
      existingSource.setData(geoJsonData);
      const beamSource = map.getSource('sun-beam-source');
      if (beamSource) {
        beamSource.setData(getSunBeamGeoJson());
      }
    }
  }, [spots, windowsBySpotId, selectedSpot, getSunBeamGeoJson]);

  // Initialize MapLibre
  useEffect(() => {
    if (mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
      center: userLocation || [LODZ_CENTER.lng, LODZ_CENTER.lat],
      zoom: 15.6,
      pitch: 40,
      bearing: 0,
      attributionControl: false
    });

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-left');

    map.on('load', () => {
      syncAreaLayers(map);
    });

    // Map click handler for GPS placement when isSimulatingGps is active
    map.on('click', (e) => {
      if (isSimulatingGpsRef.current && onSetUserLocation) {
        onSetUserLocation([e.lngLat.lng, e.lngLat.lat]);
      }
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update Polygon GeoJSON data and sunbeam when selectedSpot changes
  useEffect(() => {
    if (mapRef.current) {
      syncAreaLayers(mapRef.current);
    }
  }, [syncAreaLayers]);

  // Update User Location GPS Pin on map (with DRAGGABLE capability!)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !userLocation) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.setLngLat(userLocation);
    } else {
      const el = document.createElement('div');
      el.className = 'user-gps-container';
      el.id = 'marker-user-location';
      el.title = 'Drag pin anywhere to simulate your GPS position!';
      el.innerHTML = `
        <div class="user-gps-radar"></div>
        <div class="user-gps-core"></div>
      `;

      const popup = new maplibregl.Popup({ offset: 15, closeButton: false }).setHTML(`
        <div style="font-family: var(--font-body); padding: 4px; color: #111827;">
          <strong style="color: #2563eb;">📍 Your GPS Location</strong>
          <div style="font-size: 0.74rem; color: #64748b; margin-top: 2px;">
            💡 <em>Drag pin anywhere to simulate GPS movement!</em>
          </div>
        </div>
      `);

      const marker = new maplibregl.Marker({
        element: el,
        draggable: true
      })
        .setLngLat(userLocation)
        .setPopup(popup)
        .addTo(map);

      // When dragged, update parent userLocation immediately!
      marker.on('dragend', () => {
        const lngLat = marker.getLngLat();
        if (onSetUserLocation) {
          onSetUserLocation([lngLat.lng, lngLat.lat]);
        }
      });

      userMarkerRef.current = marker;
    }
  }, [userLocation, onSetUserLocation]);

  // Update spot centroid markers on the map
  // ONLY CLICKING ON AN ICON REVEALS ITS SUNLIT AREA!
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear previous markers
    Object.values(markersRef.current).forEach((m) => m.remove());
    markersRef.current = {};

    spots.forEach((spot) => {
      const win = windowsBySpotId[spot.id];
      const isSunny = win?.status === 'sunny';
      const isSelected = selectedSpot?.id === spot.id;

      // Create custom DOM element for centroid marker icon
      const el = document.createElement('div');
      el.className = `lumos-marker ${isSelected ? 'is-selected-marker' : ''}`;
      el.id = `map-marker-${spot.id}`;
      el.title = `Click icon to reveal sunlit area for ${spot.name}`;
      el.innerHTML = `
        <div class="marker-pin ${isSunny ? 'sunny' : 'shaded'} ${spot.isHyperLocal ? 'hyperlocal' : ''} ${isSelected ? 'active-ring' : ''}">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${isSunny ? '#111827' : '#94a3b8'}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="5"></circle>
            <line x1="12" y1="1" x2="12" y2="3"></line>
            <line x1="12" y1="21" x2="12" y2="23"></line>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
            <line x1="1" y1="12" x2="3" y2="12"></line>
            <line x1="21" y1="12" x2="23" y2="12"></line>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
          </svg>
        </div>
      `;

      // ONLY CLICKING ON THE ICON THEN REVEALS AND SHOWS THE AREA
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        onSelectSpot(spot);
      });

      // Add popup
      const popup = new maplibregl.Popup({ offset: 25, closeButton: false }).setHTML(`
        <div style="font-family: var(--font-body); padding: 4px; color: #111827;">
          <strong style="font-size: 0.9rem;">${spot.name}</strong>
          <div style="font-size: 0.78rem; color: #4b5563; margin-top: 2px;">
            ${win?.label || 'Calculating...'}
          </div>
          <div style="font-size: 0.72rem; color: #d97706; margin-top: 4px; font-weight: 600;">
            ☀️ Sunlit ground area: ~${spot.sunlitAreaM2 || 350} m²
          </div>
        </div>
      `);

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat(spot.coordinates)
        .setPopup(popup)
        .addTo(map);

      markersRef.current[spot.id] = marker;
    });
  }, [spots, windowsBySpotId, selectedSpot, onSelectSpot]);

  // Smoothly pan and fly when spot is selected via icon
  useEffect(() => {
    if (!mapRef.current || !selectedSpot) return;

    mapRef.current.flyTo({
      center: selectedSpot.coordinates,
      zoom: 16.8,
      pitch: 45,
      essential: true,
      duration: 1200
    });

    const marker = markersRef.current[selectedSpot.id];
    if (marker) {
      marker.togglePopup();
    }
  }, [selectedSpot]);

  // Handle Locate Me click
  const handleLocateMeClick = () => {
    if (onLocateMe) {
      onLocateMe();
    }
    if (mapRef.current && userLocation) {
      mapRef.current.flyTo({
        center: userLocation,
        zoom: 16.5,
        pitch: 40,
        essential: true,
        duration: 1200
      });
      if (userMarkerRef.current) {
        userMarkerRef.current.togglePopup();
      }
    }
  };

  return (
    <div className="map-container-wrapper" id="container-map">
      <div ref={mapContainerRef} className="maplibre-viewport" />

      {/* Floating Map Action Buttons */}
      <div className="map-floating-controls">
        <button
          id="btn-locate-me"
          className="map-tool-btn"
          onClick={handleLocateMeClick}
          title="Find sunlit benches near your actual GPS position"
        >
          <Crosshair size={16} color="#3b82f6" />
          <span>My Location</span>
        </button>

        <button
          id="btn-simulate-gps"
          className={`map-tool-btn ${isSimulatingGps ? 'active' : ''}`}
          onClick={() => setIsSimulatingGps((prev) => !prev)}
          title="Click to toggle GPS placement mode on the map"
        >
          <MapPin size={16} color={isSimulatingGps ? '#f59e0b' : '#34d399'} />
          <span>{isSimulatingGps ? 'Click Map to Move GPS' : 'Simulate GPS'}</span>
        </button>
      </div>

      {/* GPS Simulation Active Instruction Banner */}
      {isSimulatingGps && (
        <div className="gps-simulation-banner" id="banner-gps-sim-active">
          <MapPin size={14} color="#34d399" />
          <span>
            <strong>GPS Placement Mode:</strong> Click anywhere on the map or drag the blue radar pin to simulate your position.
          </span>
          <button className="gps-banner-close" onClick={() => setIsSimulatingGps(false)}>
            Done
          </button>
        </div>
      )}

      {/* Active Sunlit Area Overlay Badge when an icon is clicked */}
      {selectedSpot && (
        <div className="active-area-badge" id="badge-active-sunlit-area">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="active-area-icon">
              <Sun size={18} color="#f59e0b" />
            </div>
            <div>
              <div className="active-area-title">
                <strong>{selectedSpot.name}</strong>
              </div>
              <div className="active-area-subtitle">
                ☀️ <strong>~{selectedSpot.sunlitAreaM2 || 350} m²</strong> active sunlit area revealed • {Math.round(selectedSpot.skyViewFactor * 100)}% Open Sky
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Solar Compass HUD */}
      <div className="solar-compass-card" id="widget-solar-compass">
        <div className="compass-visual">
          <div
            className="compass-sun-needle"
            style={{ transform: `rotate(${solarPos.azimuthDeg}deg)` }}
            title={`Sun Azimuth: ${solarPos.azimuthDeg}°`}
          >
            <div className="needle-dot" />
          </div>
          <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8' }}>N</span>
        </div>
        <div className="compass-readout">
          <span className="compass-label">Solar Bearing (Łódź)</span>
          <span className="compass-value">{solarPos.azimuthDeg}° Azimuth</span>
          <span className="compass-sub">
            Elevation: <strong style={{ color: '#f59e0b' }}>{solarPos.elevationDeg}°</strong> above horizon
          </span>
        </div>
      </div>

      {/* Floating Mini HUD for Active Sun-Soaking Session when Modal is Closed */}
      {activeSession && !activeSession.isModalOpen && (
        <div
          className={`session-mini-hud ${sessionGeofence?.isInside ? 'inside' : 'paused'}`}
          id="hud-active-sun-session"
        >
          <div className="hud-header">
            <div className="hud-title-col">
              <span className="hud-badge">
                {sessionGeofence?.isInside ? '🟢 Absorbing Sun' : '⏸️ Exposure Paused'}
              </span>
              <strong className="hud-spot-name">{activeSession.spot.name}</strong>
            </div>
            <div className="hud-timer-col">
              <span className="hud-time-digits">
                {String(Math.floor(activeSession.elapsedSeconds / 60)).padStart(2, '0')}:
                {String(activeSession.elapsedSeconds % 60).padStart(2, '0')} / 15:00
              </span>
            </div>
          </div>

          <div className="hud-geofence-note">
            {sessionGeofence?.isInside ? (
              <span style={{ color: '#34d399' }}>☀️ Inside sunlit area: timer actively counting</span>
            ) : (
              <span style={{ color: '#f59e0b' }}>⚠️ Outside area ({sessionGeofence?.distanceMeters ?? 0}m away): timer paused</span>
            )}
          </div>

          <div className="hud-action-row">
            {!sessionGeofence?.isInside ? (
              <button
                className="hud-btn teleport"
                onClick={() => onTeleportToSpot && onTeleportToSpot(activeSession.spot)}
                title="Teleport GPS directly inside this sunlit area"
              >
                📍 Teleport Inside
              </button>
            ) : (
              <button
                className="hud-btn pause-test"
                onClick={() => onStepOutsideSpot && onStepOutsideSpot(activeSession.spot)}
                title="Step outside to test geofence pausing"
              >
                🚶 Step Outside
              </button>
            )}
            <button
              className="hud-btn expand"
              onClick={onOpenSessionModal}
              title="Open full session view"
            >
              View Session
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

