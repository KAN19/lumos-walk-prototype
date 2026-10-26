import React, { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import { LODZ_CENTER } from '../data/sunnySpotsLodz';
import { getDistanceMeters, spotsToGeoJson } from '../utils/geoUtils';
import {
  VERIFIED_REAL_OSM_BUILDINGS,
  VERIFIED_REAL_OSM_SIDEWALKS,
  generateAllBuildingShadowsGeoJson,
  createTreeCrownPolygon,
  filterNearbySidewalks
} from '../services/osmShadowService';

export default function MapComponent({
  activeMode = 'router', // 'router' | 'spots' | 'debug'
  spots = [],
  windowsBySpotId = {},
  selectedSpot = null,
  viewingSpotArea = null, // Step 2 of Sunny Spots: null = Neighborhood Overview, spot = Whole-Area Footprint
  onSelectSpot,
  userLocation,
  onSetUserLocation,
  gpsRecenterTrigger = 0,
  debugFocusCoord = null,
  solarPos,
  routeData,
  selectedRouteType = 'sunny',
  onSelectRouteType,
  startLocation,
  destinationLocation,
  isPickingMapPoint = null,
  onMapPointPicked,
  show3dBuildings = false,
  // Debug Street Raycast Inspector props
  osmBuildings = VERIFIED_REAL_OSM_BUILDINGS,
  osmSidewalks = VERIFIED_REAL_OSM_SIDEWALKS,
  inspectionResult = null,
  onInspectPoint,
  onHoverCoord
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef({});
  const userMarkerRef = useRef(null);
  const endpointMarkersRef = useRef([]);
  const debugMarkerRef = useRef(null);

  const isPickingMapPointRef = useRef(isPickingMapPoint);
  const onMapPointPickedRef = useRef(onMapPointPicked);
  const activeModeRef = useRef(activeMode);
  const onInspectPointRef = useRef(onInspectPoint);
  const onHoverCoordRef = useRef(onHoverCoord);

  // Track when the MapLibre style & canvas are ready so layers ALWAYS render
  const [isMapReady, setIsMapReady] = useState(false);

  useEffect(() => {
    isPickingMapPointRef.current = isPickingMapPoint;
    activeModeRef.current = activeMode;
    if (mapRef.current) {
      mapRef.current.getCanvas().style.cursor =
        isPickingMapPoint || activeMode === 'debug' ? 'crosshair' : '';
    }
  }, [isPickingMapPoint, activeMode]);

  useEffect(() => {
    onMapPointPickedRef.current = onMapPointPicked;
  }, [onMapPointPicked]);

  useEffect(() => {
    onInspectPointRef.current = onInspectPoint;
  }, [onInspectPoint]);

  useEffect(() => {
    onHoverCoordRef.current = onHoverCoord;
  }, [onHoverCoord]);

  // Build GeoJSON for 3D OSM Buildings + 3D OSM Tree Crowns
  const getOsm3dObjectsGeoJson = useCallback(() => {
    return {
      type: 'FeatureCollection',
      features: (osmBuildings || VERIFIED_REAL_OSM_BUILDINGS).map((obj) => ({
        type: 'Feature',
        id: obj.id,
        properties: {
          id: obj.id,
          name: obj.name,
          height: obj.heightMeters || 15,
          baseHeight: obj.type === 'tree' ? obj.trunkClearanceMeters || 2.2 : 0,
          objectType: obj.type || 'building',
          color: obj.type === 'tree' ? '#10B981' : '#CBD5E1'
        },
        geometry: {
          type: 'Polygon',
          coordinates: [obj.polygon]
        }
      }))
    };
  }, [osmBuildings]);

  // Build GeoJSON for OSM Pedestrian Sidewalks (shown in Debug mode around inspected point)
  const getOsmSidewalksGeoJson = useCallback(() => {
    if (activeMode !== 'debug') {
      return { type: 'FeatureCollection', features: [] };
    }
    const focusPt = inspectionResult?.point || [19.4574, 51.7678];
    const nearbySw = filterNearbySidewalks(
      focusPt,
      osmSidewalks || VERIFIED_REAL_OSM_SIDEWALKS,
      0.0055,
      0.0040
    );
    return {
      type: 'FeatureCollection',
      features: nearbySw.map((sw) => ({
        type: 'Feature',
        id: sw.id,
        properties: {
          name: sw.name,
          widthMeters: sw.widthMeters
        },
        geometry: {
          type: 'LineString',
          coordinates: sw.coordinates
        }
      }))
    };
  }, [osmSidewalks, activeMode, inspectionResult]);

  // Build GeoJSON for 450m Radar Circle around User GPS in Spots Overview
  const getUserRadarGeoJson = useCallback(() => {
    if (activeMode !== 'spots' || viewingSpotArea || !userLocation) {
      return { type: 'FeatureCollection', features: [] };
    }
    const ring = createTreeCrownPolygon(userLocation[0], userLocation[1], 420);
    return {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [ring]
          }
        }
      ]
    };
  }, [activeMode, viewingSpotArea, userLocation]);

  // Incoming solar ray vector towards the selected spot in Spots mode
  const getSunBeamGeoJson = useCallback(() => {
    const targetSpot = viewingSpotArea || selectedSpot;
    if (
      !targetSpot ||
      !targetSpot.coordinates ||
      activeMode !== 'spots' ||
      !solarPos ||
      solarPos.elevationDeg <= 0
    ) {
      return { type: 'FeatureCollection', features: [] };
    }
    const [cx, cy] = targetSpot.coordinates;
    const metersPerDegLat = 111320;
    const metersPerDegLng = 111320 * Math.cos((cy * Math.PI) / 180);

    const azRad = ((solarPos?.azimuthDeg || 185) * Math.PI) / 180;
    const rayLengthMeters = 160;
    const sunOriginX = cx + (rayLengthMeters * Math.sin(azRad)) / metersPerDegLng;
    const sunOriginY = cy + (rayLengthMeters * Math.cos(azRad)) / metersPerDegLat;

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
  }, [viewingSpotArea, selectedSpot, solarPos, activeMode]);

  // Sync 3D Buildings, 3D Trees, Ground Shadows, and Debug Raycast layers
  const sync3dAndDebugLayers = useCallback((map) => {
    if (!map) return;

    const isDebugView = activeMode === 'debug';
    const shouldShow3d = isDebugView || (activeMode === 'router' && show3dBuildings);

    const focusPointForShadows = isDebugView
      ? inspectionResult?.point || [19.4574, 51.7678]
      : routeData?.sunnyRoute?.midpoint || userLocation || [19.4574, 51.7678];

    const shadowsGeoJson = shouldShow3d
      ? generateAllBuildingShadowsGeoJson(
          osmBuildings || VERIFIED_REAL_OSM_BUILDINGS,
          solarPos,
          focusPointForShadows
        )
      : { type: 'FeatureCollection', features: [] };

    const objects3dGeoJson = shouldShow3d
      ? getOsm3dObjectsGeoJson()
      : { type: 'FeatureCollection', features: [] };

    const sidewalksGeoJson = getOsmSidewalksGeoJson();

    const debugRayData =
      isDebugView && inspectionResult?.solarRayGeoJson
        ? { type: 'FeatureCollection', features: [inspectionResult.solarRayGeoJson] }
        : { type: 'FeatureCollection', features: [] };

    const debugShadowData =
      isDebugView && inspectionResult?.shadowPolygonGeoJson
        ? { type: 'FeatureCollection', features: [inspectionResult.shadowPolygonGeoJson] }
        : { type: 'FeatureCollection', features: [] };

    try {
      // 1. Ground Shadows cast by 3D Buildings & Trees
      const shadowSrc = map.getSource('osm-shadows-source');
      if (!shadowSrc) {
        map.addSource('osm-shadows-source', {
          type: 'geojson',
          data: shadowsGeoJson
        });
        map.addLayer({
          id: 'osm-shadows-fill',
          type: 'fill',
          source: 'osm-shadows-source',
          paint: {
            'fill-color': [
              'match',
              ['get', 'obstacleType'],
              'tree',
              '#065F46',
              '#1E293B'
            ],
            'fill-opacity': activeMode === 'debug' || viewingSpotArea ? 0.32 : 0.18
          }
        });
      } else {
        shadowSrc.setData(shadowsGeoJson);
        if (map.getLayer('osm-shadows-fill')) {
          map.setPaintProperty(
            'osm-shadows-fill',
            'fill-opacity',
            activeMode === 'debug' || viewingSpotArea ? 0.32 : 0.18
          );
        }
      }

      // 2. 3D Extruded Buildings & Green Tree Canopies
      const bldgSrc = map.getSource('osm-3d-objects-source');
      if (!bldgSrc) {
        map.addSource('osm-3d-objects-source', {
          type: 'geojson',
          data: objects3dGeoJson
        });
        map.addLayer({
          id: 'osm-3d-objects-extrusion',
          type: 'fill-extrusion',
          source: 'osm-3d-objects-source',
          paint: {
            'fill-extrusion-color': ['get', 'color'],
            'fill-extrusion-height': ['get', 'height'],
            'fill-extrusion-base': ['get', 'baseHeight'],
            'fill-extrusion-opacity': 0.78
          }
        });
      } else {
        bldgSrc.setData(objects3dGeoJson);
      }

      // 3. OSM Sidewalks (Debug Mode)
      const swSrc = map.getSource('osm-sidewalks-source');
      if (!swSrc) {
        map.addSource('osm-sidewalks-source', {
          type: 'geojson',
          data: sidewalksGeoJson
        });
        map.addLayer({
          id: 'osm-sidewalks-line',
          type: 'line',
          source: 'osm-sidewalks-source',
          paint: {
            'line-color': '#0EA5E9',
            'line-width': 3,
            'line-opacity': 0.75
          }
        });
      } else {
        swSrc.setData(sidewalksGeoJson);
      }

      // 4. Debug Inspected Obstruction Shadow Highlight
      const dbgShadowSrc = map.getSource('debug-hit-shadow-source');
      if (!dbgShadowSrc) {
        map.addSource('debug-hit-shadow-source', {
          type: 'geojson',
          data: debugShadowData
        });
        map.addLayer({
          id: 'debug-hit-shadow-fill',
          type: 'fill',
          source: 'debug-hit-shadow-source',
          paint: {
            'fill-color': '#EF4444',
            'fill-opacity': 0.38
          }
        });
      } else {
        dbgShadowSrc.setData(debugShadowData);
      }

      // 5. Debug Incoming Solar Ray Vector
      const dbgRaySrc = map.getSource('debug-solar-ray-source');
      if (!dbgRaySrc) {
        map.addSource('debug-solar-ray-source', {
          type: 'geojson',
          data: debugRayData
        });
        map.addLayer({
          id: 'debug-solar-ray-line',
          type: 'line',
          source: 'debug-solar-ray-source',
          paint: {
            'line-color': '#F59E0B',
            'line-width': 3.5,
            'line-dasharray': [2, 1.5]
          }
        });
      } else {
        dbgRaySrc.setData(debugRayData);
      }
    } catch (err) {
      console.warn('3D/Debug layer sync skipped:', err.message);
    }
  }, [
    osmBuildings,
    solarPos,
    getOsm3dObjectsGeoJson,
    getOsmSidewalksGeoJson,
    activeMode,
    show3dBuildings,
    routeData,
    userLocation,
    viewingSpotArea,
    inspectionResult
  ]);

  // Sync Sunny Spot polygons & User GPS Radar on Screen 3
  const syncAreaLayers = useCallback((map) => {
    if (!map) return;

    const targetSpot = viewingSpotArea || selectedSpot;
    const spotsToRender =
      activeMode === 'spots'
        ? viewingSpotArea
          ? [viewingSpotArea]
          : spots
        : [];

    const geoJsonData =
      spotsToRender.length > 0
        ? spotsToGeoJson(spotsToRender, windowsBySpotId, targetSpot?.id)
        : { type: 'FeatureCollection', features: [] };

    const isTargetSunny =
      targetSpot && windowsBySpotId[targetSpot.id]?.status === 'sunny';

    const fillColor = isTargetSunny ? '#FDE68A' : '#CBD5E1';
    const strokeColor = isTargetSunny ? '#F59E0B' : '#64748B';

    try {
      // User Radar Circle in Neighborhood Overview
      const radarSrc = map.getSource('user-radar-source');
      if (!radarSrc) {
        map.addSource('user-radar-source', {
          type: 'geojson',
          data: getUserRadarGeoJson()
        });
        map.addLayer({
          id: 'user-radar-fill',
          type: 'fill',
          source: 'user-radar-source',
          paint: {
            'fill-color': '#3B82F6',
            'fill-opacity': 0.06
          }
        });
        map.addLayer({
          id: 'user-radar-stroke',
          type: 'line',
          source: 'user-radar-source',
          paint: {
            'line-color': '#60A5FA',
            'line-width': 1.5,
            'line-dasharray': [3, 3]
          }
        });
      } else {
        radarSrc.setData(getUserRadarGeoJson());
      }

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
            'fill-opacity': viewingSpotArea ? 0.72 : 0.45
          }
        });

        map.addLayer({
          id: 'sunny-areas-stroke',
          type: 'line',
          source: 'sunny-areas-source',
          paint: {
            'line-color': strokeColor,
            'line-width': viewingSpotArea ? 3.5 : 2
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
          map.setPaintProperty(
            'sunny-areas-fill',
            'fill-opacity',
            viewingSpotArea ? 0.72 : 0.45
          );
        }
        if (map.getLayer('sunny-areas-stroke')) {
          map.setPaintProperty('sunny-areas-stroke', 'line-color', strokeColor);
          map.setPaintProperty(
            'sunny-areas-stroke',
            'line-width',
            viewingSpotArea ? 3.5 : 2
          );
        }
        const beamSource = map.getSource('sun-beam-source');
        if (beamSource) {
          beamSource.setData(getSunBeamGeoJson());
        }
      }
    } catch (err) {
      console.warn('Area layer sync skipped:', err.message);
    }
  }, [
    spots,
    windowsBySpotId,
    selectedSpot,
    viewingSpotArea,
    getSunBeamGeoJson,
    getUserRadarGeoJson,
    activeMode
  ]);

  // Sync Sunlight Path vs Shortest Route layers on Screen 2
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
      zoom: activeMode === 'debug' ? 16.2 : 14.6,
      pitch: activeMode === 'debug' ? 45 : 0,
      bearing: 0,
      attributionControl: false
    });

    map.on('load', () => {
      setIsMapReady(true);
    });

    map.on('mousemove', (e) => {
      if (onHoverCoordRef.current) {
        onHoverCoordRef.current([e.lngLat.lng, e.lngLat.lat]);
      }
    });

    map.on('click', (e) => {
      const coords = [e.lngLat.lng, e.lngLat.lat];
      if (isPickingMapPointRef.current && onMapPointPickedRef.current) {
        onMapPointPickedRef.current(coords, isPickingMapPointRef.current);
        return;
      }
      if (activeModeRef.current === 'debug' && onInspectPointRef.current) {
        onInspectPointRef.current(coords);
      }
    });

    mapRef.current = map;

    return () => {
      setIsMapReady(false);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Sync layers whenever map becomes ready OR routeData/spots/debug state update
  useEffect(() => {
    if (mapRef.current && isMapReady) {
      sync3dAndDebugLayers(mapRef.current);
      syncAreaLayers(mapRef.current);
      syncRouteLayers(mapRef.current);
    }
  }, [isMapReady, sync3dAndDebugLayers, syncAreaLayers, syncRouteLayers]);

  // Fit route bounds in Screen 2 (Sunlight Path)
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

  // Origin (Footprints icon) & Destination (Plain marker) for Screen 2
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady) return;

    endpointMarkersRef.current.forEach((m) => m.remove());
    endpointMarkersRef.current = [];

    if (activeMode !== 'router') return;

    if (startLocation?.coordinates) {
      const elStart = document.createElement('div');
      elStart.className = 'v22-endpoint-badge start';
      elStart.title = `Departure: ${startLocation.name}`;
      elStart.innerHTML = `
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="12" cy="5" r="2.2" fill="#FFFFFF" stroke="none" />
          <path d="M9 20l2-6 3 2v4" />
          <path d="M10 14l2-5 3.5 2" />
          <path d="M7.5 12.5L10 9.5" />
        </svg>
      `;
      const mStart = new maplibregl.Marker({ element: elStart })
        .setLngLat(startLocation.coordinates)
        .addTo(map);
      endpointMarkersRef.current.push(mStart);
    }

    if (destinationLocation?.coordinates) {
      const elDest = document.createElement('div');
      elDest.className = 'v22-endpoint-badge dest';
      elDest.title = `Destination: ${destinationLocation.name}`;
      elDest.innerText = '';
      const mDest = new maplibregl.Marker({ element: elDest })
        .setLngLat(destinationLocation.coordinates)
        .addTo(map);
      endpointMarkersRef.current.push(mDest);
    }
  }, [isMapReady, activeMode, startLocation, destinationLocation]);

  // Debug Inspected Point Pin on Hidden Debug Screen
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady) return;

    if (debugMarkerRef.current) {
      debugMarkerRef.current.remove();
      debugMarkerRef.current = null;
    }

    if (activeMode !== 'debug' || !inspectionResult?.point) return;

    const el = document.createElement('div');
    const statusClass = inspectionResult.isSunny
      ? 'sunny'
      : inspectionResult.status === 'tree-shade'
        ? 'tree'
        : inspectionResult.isNighttime
          ? 'night'
          : 'shaded';
    el.className = `v22-debug-point-pin ${statusClass}`;
    el.innerHTML = `<span class="v22-debug-pin-core">${
      inspectionResult.isSunny
        ? '☀️'
        : inspectionResult.status === 'tree-shade'
          ? '🌳'
          : inspectionResult.isNighttime
            ? '🌙'
            : '🏢'
    }</span>`;

    const m = new maplibregl.Marker({ element: el })
      .setLngLat(inspectionResult.point)
      .addTo(map);
    debugMarkerRef.current = m;
  }, [isMapReady, activeMode, inspectionResult]);

  // User GPS Pin in Sunny Spots (spots) mode only — so it never collides with Route A/B pins or Debug pins
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
      el.className = 'v22-user-gps-pin-wrap';
      el.innerHTML = `
        <div class="v22-user-gps-pulse"></div>
        <div class="v22-user-gps-dot"></div>
        <div class="v22-user-gps-label">You (GPS)</div>
      `;
      el.title = 'Your Live GPS Location (Drag to adjust)';
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

  // Spot Markers in Screen 3:
  // - In Step 1 (Neighborhood Overview, viewingSpotArea === null): Show compact icon pins ONLY (no cluttered text banners!)
  // - In Step 2 (Zoomed Whole-Area View, viewingSpotArea !== null): Show the Whole Sunlit Area Footprint badge over the polygon
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady) return;

    Object.values(markersRef.current).forEach((m) => m.remove());
    markersRef.current = {};

    if (activeMode !== 'spots') return;

    if (viewingSpotArea) {
      // Step 2: Whole-Area Sunlit Footprint Overlay Badge on the zoomed polygon
      const win = windowsBySpotId[viewingSpotArea.id];
      const isSunny = win?.status === 'sunny';
      const el = document.createElement('div');
      el.className = `v22-whole-area-badge ${isSunny ? 'sunny' : 'shaded'}`;
      el.innerHTML = `
        <div class="v22-area-eyebrow">Whole Sunlit Area Footprint</div>
        <div class="v22-area-title-pill">${isSunny ? '☀️' : '☁️'} ${viewingSpotArea.name.split(' (')[0]}</div>
        <div class="v22-area-meta">${
          isSunny
            ? `${viewingSpotArea.openSkyPercent || 90}% Unshaded • ${win?.label || 'Sunny until 14:40'}`
            : '⚠️ Enters building/tree shade at this hour'
        }</div>
        <div class="v22-area-benches-pill">🪑 ${viewingSpotArea.benchesCount || 6} Benches in Area</div>
      `;
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat(viewingSpotArea.coordinates)
        .addTo(map);
      markersRef.current[viewingSpotArea.id] = marker;
      return;
    }

    // Step 1: Neighborhood Overview — clean compact circular pins (details hidden until user taps a pin)
    spots.forEach((spot, index) => {
      const win = windowsBySpotId[spot.id];
      const isSunny = win?.status === 'sunny';
      const rank = index + 1;
      const isNearest = rank === 1;

      const el = document.createElement('div');
      el.className = `v22-compact-spot-pin ${isNearest ? 'nearest' : ''} ${isSunny ? 'sunny' : 'shaded'}`;
      el.title = `${spot.name.split(' (')[0]} — Tap to view details`;
      el.innerHTML = `
        <span class="v22-compact-pin-icon">${isSunny ? '☀️' : '☁️'}</span>
        ${isNearest ? '<span class="v22-compact-pin-nearest-dot">#1</span>' : ''}
      `;

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        if (onSelectSpot) onSelectSpot(spot);
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat(spot.coordinates)
        .addTo(map);

      markersRef.current[spot.id] = marker;
    });
  }, [
    isMapReady,
    spots,
    windowsBySpotId,
    viewingSpotArea,
    userLocation,
    onSelectSpot,
    activeMode
  ]);

  // Camera transitions in Screen 3:
  // - When viewingSpotArea is selected: zoom into the Whole Sunlit Area Footprint with 3D pitch
  // - When returning to Neighborhood Overview (viewingSpotArea === null): frame user's GPS neighborhood
  useEffect(() => {
    if (!mapRef.current || !isMapReady || activeMode !== 'spots') return;

    if (viewingSpotArea && viewingSpotArea.coordinates) {
      mapRef.current.flyTo({
        center: viewingSpotArea.coordinates,
        zoom: 16.6,
        pitch: 42,
        bearing: -10,
        offset: [0, -25],
        duration: 650
      });
    } else if (userLocation) {
      mapRef.current.flyTo({
        center: userLocation,
        zoom: 14.5,
        pitch: 0,
        bearing: 0,
        offset: [0, -20],
        duration: 550
      });
    }
  }, [isMapReady, viewingSpotArea, activeMode]);

  // 2.5D / 3D Camera Tilt Toggle in Screen 2 (Sunlight Path)
  useEffect(() => {
    if (!mapRef.current || !isMapReady || activeMode !== 'router') return;
    mapRef.current.easeTo({
      pitch: show3dBuildings ? 46 : 0,
      bearing: show3dBuildings ? -12 : 0,
      duration: 550
    });
  }, [show3dBuildings, isMapReady, activeMode]);

  // Explicit GPS Recenter Button Trigger
  useEffect(() => {
    if (!mapRef.current || !isMapReady || !gpsRecenterTrigger || !userLocation) return;
    mapRef.current.flyTo({
      center: userLocation,
      zoom: activeMode === 'router' && show3dBuildings ? 15.8 : 14.8,
      pitch: activeMode === 'router' && show3dBuildings ? 46 : 0,
      bearing: activeMode === 'router' && show3dBuildings ? -12 : 0,
      duration: 600
    });
  }, [gpsRecenterTrigger, isMapReady, userLocation, activeMode, show3dBuildings]);

  // Fly camera when selecting one of the 4 Pilot Zones in Debug mode
  useEffect(() => {
    if (!mapRef.current || !isMapReady || activeMode !== 'debug' || !debugFocusCoord) return;
    mapRef.current.flyTo({
      center: debugFocusCoord,
      zoom: 16.3,
      pitch: 46,
      bearing: -12,
      offset: [0, -25],
      duration: 700
    });
  }, [debugFocusCoord, isMapReady, activeMode]);

  return (
    <div className="v22-map-wrapper">
      <div ref={mapContainerRef} className="v22-map-canvas" />
    </div>
  );
}
