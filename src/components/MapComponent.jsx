import React, { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import { LODZ_CENTER } from '../data/sunnySpotsLodz';
import { spotsToGeoJson } from '../utils/geoUtils';

export default function MapComponent({
  activeMode = 'router', // 'router' | 'spots'
  spots = [],
  windowsBySpotId = {},
  selectedSpot = null,
  onSelectSpot,
  userLocation,
  onSetUserLocation,
  solarPos,
  routeData,
  selectedRouteType = 'sunny',
  onSelectRouteType,
  startLocation,
  destinationLocation,
  isPickingMapPoint = null,
  onMapPointPicked
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef({});
  const userMarkerRef = useRef(null);
  const endpointMarkersRef = useRef([]);
  const isPickingMapPointRef = useRef(isPickingMapPoint);
  const onMapPointPickedRef = useRef(onMapPointPicked);

  // Track when the MapLibre style & canvas are ready so layers ALWAYS render
  const [isMapReady, setIsMapReady] = useState(false);

  useEffect(() => {
    isPickingMapPointRef.current = isPickingMapPoint;
    if (mapRef.current) {
      mapRef.current.getCanvas().style.cursor = isPickingMapPoint ? 'crosshair' : '';
    }
  }, [isPickingMapPoint]);

  useEffect(() => {
    onMapPointPickedRef.current = onMapPointPicked;
  }, [onMapPointPicked]);

  // Incoming solar ray vector towards the selected spot in Spots mode
  const getSunBeamGeoJson = useCallback(() => {
    if (!selectedSpot || !selectedSpot.coordinates || activeMode !== 'spots') {
      return { type: 'FeatureCollection', features: [] };
    }
    const [cx, cy] = selectedSpot.coordinates;
    const metersPerDegLat = 111320;
    const metersPerDegLng = 111320 * Math.cos((cy * Math.PI) / 180);

    const azRad = ((solarPos?.azimuthDeg || 185) * Math.PI) / 180;
    const rayLengthMeters = 160;
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
          }
        }
      ]
    };
  }, [selectedSpot, solarPos, activeMode]);

  // Sync Sunny Spot polygons on the bright map
  const syncAreaLayers = useCallback((map) => {
    if (!map) return;

    const geoJsonData =
      activeMode === 'spots'
        ? spotsToGeoJson(spots, windowsBySpotId, selectedSpot?.id)
        : { type: 'FeatureCollection', features: [] };

    const isSelectedSunny =
      selectedSpot && windowsBySpotId[selectedSpot.id]?.status === 'sunny';

    const fillColor = isSelectedSunny ? '#FDE68A' : '#CBD5E1';
    const strokeColor = isSelectedSunny ? '#F59E0B' : '#64748B';

    try {
      const existingSource = map.getSource('sunny-areas-source');
      if (!existingSource) {
        map.addSource('sunny-areas-source', {
          type: 'geojson',
          data: geoJsonData
        });

        map.addLayer({
          id: 'sunny-areas-fill',
          type: 'fill',
          source: 'sunny-areas-source',
          paint: {
            'fill-color': fillColor,
            'fill-opacity': 0.65
          }
        });

        map.addLayer({
          id: 'sunny-areas-stroke',
          type: 'line',
          source: 'sunny-areas-source',
          paint: {
            'line-color': strokeColor,
            'line-width': 3
          }
        });

        map.addSource('sun-beam-source', {
          type: 'geojson',
          data: getSunBeamGeoJson()
        });

        map.addLayer({
          id: 'sun-beam-line',
          type: 'line',
          source: 'sun-beam-source',
          paint: {
            'line-color': '#F59E0B',
            'line-width': 2.5,
            'line-dasharray': [3, 2]
          }
        });
      } else {
        existingSource.setData(geoJsonData);
        if (map.getLayer('sunny-areas-fill')) {
          map.setPaintProperty('sunny-areas-fill', 'fill-color', fillColor);
        }
        if (map.getLayer('sunny-areas-stroke')) {
          map.setPaintProperty('sunny-areas-stroke', 'line-color', strokeColor);
        }
        const beamSource = map.getSource('sun-beam-source');
        if (beamSource) {
          beamSource.setData(getSunBeamGeoJson());
        }
      }
    } catch (err) {
      console.warn('Area layer sync skipped:', err.message);
    }
  }, [spots, windowsBySpotId, selectedSpot, getSunBeamGeoJson, activeMode]);

  // Sync Sunlight Path vs Shortest Route layers on the bright map
  const syncRouteLayers = useCallback((map) => {
    if (!map) return;

    const routesList =
      activeMode === 'router' && routeData
        ? [routeData.shortestRoute, routeData.sunnyRoute].filter(Boolean)
        : [];

    const allKnownTypes = ['shortest', 'sunny'];

    try {
      if (routesList.length === 0) {
        allKnownTypes.forEach((type) => {
          const src = map.getSource(`route-${type}-source`);
          if (src) {
            src.setData({ type: 'FeatureCollection', features: [] });
          }
        });
        return;
      }

      routesList.forEach((r) => {
        const type = r.routeType;
        const isSelected = selectedRouteType === type;
        const isSunnyRoute = type === 'sunny';
        const srcId = `route-${type}-source`;
        const glowId = `route-${type}-glow`;
        const lineId = `route-${type}-line`;

        const existingSource = map.getSource(srcId);
        if (!existingSource) {
          map.addSource(srcId, {
            type: 'geojson',
            data: r.geoJson
          });

          // Warm Sun Halo for Sunny Route / Subtle Casing for Shortest Route
          map.addLayer({
            id: glowId,
            type: 'line',
            source: srcId,
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: {
              'line-color': isSunnyRoute ? '#FDE68A' : '#E2E8F0',
              'line-width': isSelected ? 18 : 11,
              'line-opacity': isSunnyRoute ? 0.9 : 0.65
            }
          });

          // Core Route Line
          const paintProps = {
            'line-color': isSunnyRoute ? '#F59E0B' : '#64748B',
            'line-width': isSelected ? 6 : 4,
            'line-opacity': isSelected ? 1.0 : 0.75
          };
          if (!isSunnyRoute) {
            paintProps['line-dasharray'] = [2, 2];
          }

          map.addLayer({
            id: lineId,
            type: 'line',
            source: srcId,
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: paintProps
          });

          map.on('click', lineId, (e) => {
            e.originalEvent?.stopPropagation();
            if (onSelectRouteType) onSelectRouteType(type);
          });
        } else {
          existingSource.setData(r.geoJson);
          if (map.getLayer(glowId)) {
            map.setPaintProperty(glowId, 'line-width', isSelected ? 18 : 11);
            map.setPaintProperty(glowId, 'line-opacity', isSelected ? 0.92 : 0.5);
          }
          if (map.getLayer(lineId)) {
            map.setPaintProperty(lineId, 'line-width', isSelected ? 6 : 4);
            map.setPaintProperty(lineId, 'line-opacity', isSelected ? 1.0 : 0.75);
          }
        }
      });

      if (selectedRouteType) {
        [`route-${selectedRouteType}-glow`, `route-${selectedRouteType}-line`].forEach((lId) => {
          if (map.getLayer(lId)) {
            map.moveLayer(lId);
          }
        });
      }
    } catch (err) {
      console.warn('Route layer sync skipped:', err.message);
    }
  }, [routeData, selectedRouteType, activeMode, onSelectRouteType]);

  // Initialize MapLibre with Bright Minimalist Positron Style
  useEffect(() => {
    if (mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
      center: userLocation || [LODZ_CENTER.lng, LODZ_CENTER.lat],
      zoom: 14.6,
      pitch: 0,
      bearing: 0,
      attributionControl: false
    });

    map.on('load', () => {
      setIsMapReady(true);
    });

    map.on('click', (e) => {
      const coords = [e.lngLat.lng, e.lngLat.lat];
      if (isPickingMapPointRef.current && onMapPointPickedRef.current) {
        onMapPointPickedRef.current(coords, isPickingMapPointRef.current);
      }
    });

    mapRef.current = map;

    return () => {
      setIsMapReady(false);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Sync layers whenever map becomes ready OR routeData/spots update
  useEffect(() => {
    if (mapRef.current && isMapReady) {
      syncAreaLayers(mapRef.current);
      syncRouteLayers(mapRef.current);
    }
  }, [isMapReady, syncAreaLayers, syncRouteLayers]);

  // Fit route bounds in Screen 2 (Sunlight Path) whenever routeData updates or map finishes loading
  useEffect(() => {
    if (!mapRef.current || !isMapReady || activeMode !== 'router' || !routeData) return;

    const allCoords = [];
    [routeData.sunnyRoute, routeData.shortestRoute].forEach((r) => {
      if (r?.rawCoordinates) {
        allCoords.push(...r.rawCoordinates);
      }
    });
    if (allCoords.length < 2) return;

    let minLng = Infinity;
    let minLat = Infinity;
    let maxLng = -Infinity;
    let maxLat = -Infinity;

    allCoords.forEach(([lng, lat]) => {
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    });

    mapRef.current.fitBounds(
      [
        [minLng, minLat],
        [maxLng, maxLat]
      ],
      {
        padding: { top: 130, bottom: 235, left: 45, right: 45 },
        duration: 650,
        maxZoom: 15.6
      }
    );
  }, [isMapReady, routeData, activeMode]);

  // Origin (A: Departure) & Destination (B: Arrival) markers for Screen 2
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady) return;

    endpointMarkersRef.current.forEach((m) => m.remove());
    endpointMarkersRef.current = [];

    if (activeMode !== 'router') return;

    if (startLocation?.coordinates) {
      const elStart = document.createElement('div');
      elStart.className = 'v22-endpoint-badge start';
      elStart.title = `Departure (A): ${startLocation.name}`;
      elStart.innerText = 'A';
      const mStart = new maplibregl.Marker({ element: elStart })
        .setLngLat(startLocation.coordinates)
        .addTo(map);
      endpointMarkersRef.current.push(mStart);
    }

    if (destinationLocation?.coordinates) {
      const elDest = document.createElement('div');
      elDest.className = 'v22-endpoint-badge dest';
      elDest.title = `Destination (B): ${destinationLocation.name}`;
      elDest.innerText = 'B';
      const mDest = new maplibregl.Marker({ element: elDest })
        .setLngLat(destinationLocation.coordinates)
        .addTo(map);
      endpointMarkersRef.current.push(mDest);
    }
  }, [isMapReady, activeMode, startLocation, destinationLocation]);

  // Draggable User GPS Pin in Spots mode
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady || !userLocation) return;

    if (activeMode !== 'spots') {
      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
      }
      return;
    }

    if (userMarkerRef.current) {
      userMarkerRef.current.setLngLat(userLocation);
    } else {
      const el = document.createElement('div');
      el.className = 'v22-user-gps-pin';
      el.title = 'Your GPS Location (Drag to move)';
      const marker = new maplibregl.Marker({ element: el, draggable: true })
        .setLngLat(userLocation)
        .addTo(map);

      marker.on('dragend', () => {
        const lngLat = marker.getLngLat();
        if (onSetUserLocation) {
          onSetUserLocation([lngLat.lng, lngLat.lat]);
        }
      });

      userMarkerRef.current = marker;
    }
  }, [isMapReady, activeMode, userLocation, onSetUserLocation]);

  // Spot Markers in Screen 3 (Sunny Spots by Time)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady) return;

    Object.values(markersRef.current).forEach((m) => m.remove());
    markersRef.current = {};

    if (activeMode !== 'spots') return;

    spots.forEach((spot) => {
      const win = windowsBySpotId[spot.id];
      const isSunny = win?.status === 'sunny';
      const isSelected = selectedSpot?.id === spot.id;

      const el = document.createElement('div');
      el.className = `v22-spot-marker ${isSunny ? 'sunny' : 'shaded'} ${isSelected ? 'selected' : ''}`;
      el.innerHTML = isSelected
        ? `<div class="v22-spot-pill-expanded">
             <span class="v22-spot-pill-title">${isSunny ? '☀️' : '☁️'} ${spot.name.split(' (')[0]}</span>
             <span class="v22-spot-pill-sub">${isSunny ? `Sunny (${win?.minutesRemaining || 90}m left)` : '⚠️ Shaded at this hour'}</span>
           </div>`
        : `<div class="v22-spot-dot">${isSunny ? '☀️' : '☁️'}</div>`;

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        if (onSelectSpot) onSelectSpot(spot);
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat(spot.coordinates)
        .addTo(map);

      markersRef.current[spot.id] = marker;
    });
  }, [isMapReady, spots, windowsBySpotId, selectedSpot, onSelectSpot, activeMode]);

  // Center map on selected spot in Screen 3
  useEffect(() => {
    if (!mapRef.current || !isMapReady || !selectedSpot || activeMode !== 'spots') return;
    mapRef.current.easeTo({
      center: selectedSpot.coordinates,
      zoom: 15.8,
      offset: [0, -30],
      duration: 600
    });
  }, [isMapReady, selectedSpot, activeMode]);

  return (
    <div className="v22-map-wrapper">
      <div ref={mapContainerRef} className="v22-map-canvas" />
    </div>
  );
}
