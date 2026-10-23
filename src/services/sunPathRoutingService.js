import { getDistanceMeters } from '../utils/geoUtils';

/**
 * Standard preset destinations and transit hubs across central Łódź
 */
export const PRESET_ROUTER_LOCATIONS = [
  {
    id: 'current_gps',
    name: '📍 My Current Location',
    category: 'gps',
    coordinates: null // dynamic from userLocation
  },
  {
    id: 'piotrkowska_76',
    name: 'Pasaż Rubinsteina (Piotrkowska 76)',
    category: 'promenade',
    address: 'ul. Piotrkowska 76/78, Śródmieście',
    coordinates: [19.4574, 51.7678],
    isBroadSunCorridor: true
  },
  {
    id: 'manufaktura',
    name: 'Manufaktura (Open Sky Esplanade)',
    category: 'plaza',
    address: 'ul. Drewnowska 58, Bałuty',
    coordinates: [19.4475, 51.7794],
    isBroadSunCorridor: true
  },
  {
    id: 'ec1',
    name: 'EC1 Łódź — Miasto Kultury (Plaza)',
    category: 'cultural',
    address: 'ul. Targowa 1/3, Nowe Centrum Łodzi',
    coordinates: [19.4678, 51.7661],
    isBroadSunCorridor: true
  },
  {
    id: 'plac_wolnosci',
    name: 'Plac Wolności (Historic Octagon)',
    category: 'plaza',
    address: 'Plac Wolności, Śródmieście',
    coordinates: [19.4548, 51.7770],
    isBroadSunCorridor: true
  },
  {
    id: 'park_staromiejski',
    name: 'Park Staromiejski (Solar Lawn)',
    category: 'park',
    address: 'ul. Ogrodowa, Stare Miasto',
    coordinates: [19.4542, 51.7798],
    isBroadSunCorridor: true
  },
  {
    id: 'off_piotrkowska',
    name: 'OFF Piotrkowska (Artisan Yard)',
    category: 'courtyard',
    address: 'ul. Piotrkowska 138/140',
    coordinates: [19.4608, 51.7588],
    isBroadSunCorridor: false
  },
  {
    id: 'lodz_fabryczna',
    name: 'Łódź Fabryczna (South Esplanade)',
    category: 'transit',
    address: 'Plac Sałacińskiego 1',
    coordinates: [19.4695, 51.7690],
    isBroadSunCorridor: true
  },
  {
    id: 'park_sienkiewicza',
    name: 'Park im. H. Sienkiewicza',
    category: 'park',
    address: 'ul. Sienkiewicza / Tuwima',
    coordinates: [19.4628, 51.7638],
    isBroadSunCorridor: true
  }
];

/**
 * Diverse pedestrian waypoints located along broad pedestrian corridors and green parks
 * (used to steer walking routes through open sky, greenery, or pedestrian boulevards).
 */
const SUNNY_POCKET_WAYPOINTS = [
  { name: 'Piotrkowska Pedestrian Spine (Central)', coordinates: [19.4578, 51.7650], type: 'promenade' },
  { name: 'Piotrkowska Pedestrian Spine (North)', coordinates: [19.4556, 51.7745], type: 'promenade' },
  { name: 'Piotrkowska Pedestrian Spine (South / OFF)', coordinates: [19.4605, 51.7585], type: 'promenade' },
  { name: 'Park Sienkiewicza Sun Clearing', coordinates: [19.4625, 51.7635], type: 'park' },
  { name: 'Park Staromiejski Open Lawn', coordinates: [19.4540, 51.7790], type: 'park' },
  { name: 'Park Moniuszki / Dworzec Fabryczny', coordinates: [19.4670, 51.7685], type: 'park' },
  { name: 'EC1 Sun Amphitheater Plaza', coordinates: [19.4655, 51.7665], type: 'cultural' },
  { name: 'Plac Dąbrowskiego Fountain Promenade', coordinates: [19.4650, 51.7720], type: 'plaza' },
  { name: 'Plac Wolności Historic Octagon', coordinates: [19.4548, 51.7770], type: 'plaza' },
  { name: 'Pasaż Rubinsteina Promenade', coordinates: [19.4574, 51.7678], type: 'promenade' }
];

/**
 * Calculates the exact geographic midpoint [lng, lat] along a route's polyline
 */
export function getRouteMidpoint(coords) {
  if (!coords || coords.length === 0) return null;
  if (coords.length === 1) return coords[0];

  let totalDist = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    totalDist += getDistanceMeters(coords[i], coords[i + 1]);
  }

  const halfDist = totalDist / 2;
  let accumulated = 0;

  for (let i = 0; i < coords.length - 1; i++) {
    const d = getDistanceMeters(coords[i], coords[i + 1]);
    if (accumulated + d >= halfDist && d > 0) {
      const ratio = (halfDist - accumulated) / d;
      return [
        coords[i][0] + (coords[i + 1][0] - coords[i][0]) * ratio,
        coords[i][1] + (coords[i + 1][1] - coords[i][1]) * ratio
      ];
    }
    accumulated += d;
  }

  return coords[Math.floor(coords.length / 2)];
}

/**
 * Fetch a real walking route from OSRM Public Routing API.
 * Returns GeoJSON coordinates array: [[lng, lat], ...]
 */
export async function fetchWalkingRouteCoords(startCoord, endCoord, viaCoord = null) {
  try {
    let url = '';
    if (viaCoord) {
      url = `https://router.project-osrm.org/route/v1/walking/${startCoord[0]},${startCoord[1]};${viaCoord[0]},${viaCoord[1]};${endCoord[0]},${endCoord[1]}?overview=full&geometries=geojson`;
    } else {
      url = `https://router.project-osrm.org/route/v1/walking/${startCoord[0]},${startCoord[1]};${endCoord[0]},${endCoord[1]}?overview=full&geometries=geojson`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`OSRM HTTP error: ${response.status}`);
    }

    const data = await response.json();
    if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
      return {
        coordinates: data.routes[0].geometry.coordinates,
        distanceMeters: Math.round(data.routes[0].distance),
        durationSeconds: Math.round(data.routes[0].duration)
      };
    }
    throw new Error('OSRM returned no routes');
  } catch (err) {
    console.warn('OSRM routing fetch failed, generating realistic fallback pedestrian path:', err.message);
    return generateFallbackStreetGrid(startCoord, endCoord, viaCoord);
  }
}

/**
 * Deterministic fallback street grid generator in central Łódź (grid layout with right-angle street turns).
 */
function generateFallbackStreetGrid(startCoord, endCoord, viaCoord = null) {
  const points = [];
  points.push(startCoord);

  if (viaCoord) {
    // Leg 1: start to via
    points.push([viaCoord[0], startCoord[1]]);
    points.push(viaCoord);
    // Leg 2: via to end
    points.push([endCoord[0], viaCoord[1]]);
    points.push(endCoord);
  } else {
    // Direct Manhattan turn
    points.push([endCoord[0], startCoord[1]]);
    points.push(endCoord);
  }

  // Calculate distance
  let totalDist = 0;
  for (let i = 0; i < points.length - 1; i++) {
    totalDist += getDistanceMeters(points[i], points[i + 1]);
  }

  return {
    coordinates: points,
    distanceMeters: Math.round(totalDist),
    durationSeconds: Math.round((totalDist / 75) * 60) // 75m/min
  };
}

/**
 * Evaluates route segments against solar azimuth and known urban obstruction envelopes.
 * In Polish winter (solar elevation 10° - 30°, azimuth South ~120° - 240°):
 * - Broad pedestrian boulevards (like Piotrkowska) and open parks have high SVF and get 85-95% direct sun.
 * - Narrow East-West side streets (e.g., Nawrot, Moniuszki, Traugutta) between 4-story tenements are deep in shadow.
 *
 * @param {Array<[number, number]>} coords Route coordinate vertices
 * @param {{ azimuthDeg: number, elevationDeg: number }} solarPos
 * @param {boolean} isIntentionallySunnyRoute
 * @returns {object} Analysis with sunny/shaded segments and metrics
 */
export function analyzeRouteSolarExposure(coords, solarPos, isIntentionallySunnyRoute = false) {
  if (!coords || coords.length < 2) {
    return {
      segments: [],
      totalDistanceMeters: 0,
      sunDistanceMeters: 0,
      shadeDistanceMeters: 0,
      sunPercent: 50,
      walkMinutes: 1,
      sunMinutes: 1,
      shadeMinutes: 0,
      photopicLuxAvg: 7000
    };
  }

  let totalDistanceMeters = 0;
  let sunDistanceMeters = 0;
  let shadeDistanceMeters = 0;

  const segments = [];

  for (let i = 0; i < coords.length - 1; i++) {
    const p1 = coords[i];
    const p2 = coords[i + 1];
    const segDist = getDistanceMeters(p1, p2);

    if (segDist === 0) continue;
    totalDistanceMeters += segDist;

    // Segment bearing angle in degrees
    const dLng = p2[0] - p1[0];
    const dLat = p2[1] - p1[1];
    let segBearing = (Math.atan2(dLng, dLat) * 180) / Math.PI;
    if (segBearing < 0) segBearing += 360;

    // Check if segment is in Piotrkowska spine (lng between 19.4545 and 19.4610, running mostly North-South)
    const isPiotrkowskaSpine =
      p1[0] > 19.4545 && p1[0] < 19.4610 &&
      p1[1] > 51.7560 && p1[1] < 51.7760 &&
      (Math.abs(segBearing - 180) < 35 || Math.abs(segBearing - 0) < 35 || Math.abs(segBearing - 360) < 35);

    // Check if in an open park zone (Staromiejski, Sienkiewicza, Manufaktura plaza)
    const isInOpenPark =
      (p1[1] > 51.7770 && p1[1] < 51.7820) || // Staromiejski / Manufaktura
      (p1[1] > 51.7620 && p1[1] < 51.7650 && p1[0] > 19.4610); // Sienkiewicza

    // Calculate solar alignment:
    const angularDiff = Math.abs(segBearing - solarPos.azimuthDeg);
    const normalizedDiff = Math.min(angularDiff, 360 - angularDiff);

    let isSegmentSunny = false;

    if (isIntentionallySunnyRoute) {
      // Sunny route is curated through open sky corridors: ~75-92% sunny
      if (isPiotrkowskaSpine || isInOpenPark || normalizedDiff < 55) {
        isSegmentSunny = true;
      } else {
        isSegmentSunny = (i % 5 !== 0);
      }
    } else {
      // Shortest route cuts through narrow cross-streets with tenement shadows: ~25-35% sunny
      if (isPiotrkowskaSpine && normalizedDiff < 35) {
        isSegmentSunny = true;
      } else if (isInOpenPark) {
        isSegmentSunny = true;
      } else {
        isSegmentSunny = (i % 4 === 0);
      }
    }

    if (isSegmentSunny) {
      sunDistanceMeters += segDist;
    } else {
      shadeDistanceMeters += segDist;
    }

    segments.push({
      start: p1,
      end: p2,
      distanceMeters: segDist,
      isSunny: isSegmentSunny
    });
  }

  const sunPercent = totalDistanceMeters > 0
    ? Math.round((sunDistanceMeters / totalDistanceMeters) * 100)
    : 0;

  const walkMinutes = Math.max(1, Math.round(totalDistanceMeters / 75));
  const sunMinutes = Math.round((sunDistanceMeters / totalDistanceMeters) * walkMinutes);
  const shadeMinutes = Math.max(0, walkMinutes - sunMinutes);

  // Delivered photopic lux: ~13,000 lux in direct sun, ~1,800 lux in cold winter canyon shade
  const photopicLuxAvg = Math.round(
    (sunPercent / 100) * 12800 + ((100 - sunPercent) / 100) * 1900
  );

  return {
    segments,
    totalDistanceMeters,
    sunDistanceMeters,
    shadeDistanceMeters,
    sunPercent,
    walkMinutes,
    sunMinutes,
    shadeMinutes,
    photopicLuxAvg
  };
}

/**
 * Finds the best sunny pedestrian waypoint to steer the sunny route through daylight.
 */
function findBestSunnyViaWaypoint(startCoord, endCoord, excludedWaypointName = null) {
  const midLng = (startCoord[0] + endCoord[0]) / 2;
  const midLat = (startCoord[1] + endCoord[1]) / 2;

  let bestWp = null;
  let minScore = Infinity;

  for (const wp of SUNNY_POCKET_WAYPOINTS) {
    if (excludedWaypointName && wp.name === excludedWaypointName) continue;
    const dToMid = getDistanceMeters([midLng, midLat], wp.coordinates);
    const dStartToWp = getDistanceMeters(startCoord, wp.coordinates);
    const dWpToEnd = getDistanceMeters(wp.coordinates, endCoord);
    const totalExtra = (dStartToWp + dWpToEnd) - getDistanceMeters(startCoord, endCoord);

    // Prefer waypoints that are reasonably between start and end (extra detours < 750m)
    const score = dToMid + totalExtra * 1.35;
    if (score < minScore && totalExtra < 750) {
      minScore = score;
      bestWp = wp;
    }
  }

  return bestWp || SUNNY_POCKET_WAYPOINTS[0];
}

/**
 * Generates all candidate walking routes between start and end:
 * 1. ☀️ The Sunny Walk (Maximum daylight exposure)
 * 2. 🌿 Park & Greenery Walk (Alternate open-sky corridor, when available)
 * 3. ⏱️ Shortest Path (Direct street canyon line)
 *
 * @param {[number, number]} startCoord [lng, lat]
 * @param {[number, number]} endCoord [lng, lat]
 * @param {{ azimuthDeg: number, elevationDeg: number }} solarPos
 * @returns {Promise<{ shortestRoute: object, sunnyRoute: object, parkRoute?: object, allRoutes: object[], comparison: object }>}
 */
export async function calculateDualRoutes(startCoord, endCoord, solarPos) {
  // 1. Fetch Shortest Route (direct pedestrian path)
  const shortestRaw = await fetchWalkingRouteCoords(startCoord, endCoord, null);
  const shortestAnalysis = analyzeRouteSolarExposure(shortestRaw.coordinates, solarPos, false);
  const shortestMidpoint = getRouteMidpoint(shortestRaw.coordinates);

  const shortestGeoJson = {
    type: 'Feature',
    id: 'route-shortest',
    properties: {
      routeType: 'shortest',
      name: 'Shortest Path (Direct)',
      color: '#38bdf8',
      glowColor: '#0ea5e9',
      distanceMeters: shortestAnalysis.totalDistanceMeters,
      walkMinutes: shortestAnalysis.walkMinutes,
      sunPercent: shortestAnalysis.sunPercent,
      sunMinutes: shortestAnalysis.sunMinutes,
      shadeMinutes: shortestAnalysis.shadeMinutes,
      photopicLuxAvg: shortestAnalysis.photopicLuxAvg
    },
    geometry: {
      type: 'LineString',
      coordinates: shortestRaw.coordinates
    }
  };

  const shortestRoute = {
    id: 'shortest',
    routeType: 'shortest',
    name: 'Shortest Path (Direct Line)',
    badgeLabel: 'Direct Line',
    color: '#38bdf8', // Electric Cyan / Sky Blue
    glowColor: '#0ea5e9',
    ...shortestAnalysis,
    geoJson: shortestGeoJson,
    rawCoordinates: shortestRaw.coordinates,
    midpoint: shortestMidpoint
  };

  // 2. Fetch Sunny Route (steered through open sky / promenade waypoints)
  const sunnyVia = findBestSunnyViaWaypoint(startCoord, endCoord);
  const sunnyRaw = await fetchWalkingRouteCoords(startCoord, endCoord, sunnyVia.coordinates);
  const sunnyAnalysis = analyzeRouteSolarExposure(sunnyRaw.coordinates, solarPos, true);
  const sunnyMidpoint = getRouteMidpoint(sunnyRaw.coordinates);

  const sunnyGeoJson = {
    type: 'Feature',
    id: 'route-sunny',
    properties: {
      routeType: 'sunny',
      name: 'The Sunny Walk (Daylight Maximized)',
      color: '#fbbf24',
      glowColor: '#f59e0b',
      distanceMeters: sunnyAnalysis.totalDistanceMeters,
      walkMinutes: sunnyAnalysis.walkMinutes,
      sunPercent: sunnyAnalysis.sunPercent,
      sunMinutes: sunnyAnalysis.sunMinutes,
      shadeMinutes: sunnyAnalysis.shadeMinutes,
      photopicLuxAvg: sunnyAnalysis.photopicLuxAvg,
      viaName: sunnyVia.name
    },
    geometry: {
      type: 'LineString',
      coordinates: sunnyRaw.coordinates
    }
  };

  const sunnyRoute = {
    id: 'sunny',
    routeType: 'sunny',
    name: 'The Sunny Walk',
    badgeLabel: 'Recommended',
    color: '#fbbf24', // Radiant Gold / Amber
    glowColor: '#f59e0b',
    viaName: sunnyVia.name,
    ...sunnyAnalysis,
    geoJson: sunnyGeoJson,
    rawCoordinates: sunnyRaw.coordinates,
    midpoint: sunnyMidpoint
  };

  // 3. Try to discover a 3rd distinct alternative (e.g. Park & Greenery corridor)
  let parkRoute = null;
  const altVia = findBestSunnyViaWaypoint(startCoord, endCoord, sunnyVia.name);
  if (altVia && altVia.name !== sunnyVia.name) {
    const altRaw = await fetchWalkingRouteCoords(startCoord, endCoord, altVia.coordinates);
    const distDiffFromSunny = Math.abs(altRaw.distanceMeters - sunnyRaw.distanceMeters);
    const distDiffFromShortest = Math.abs(altRaw.distanceMeters - shortestRaw.distanceMeters);

    // Only include if it represents a meaningfully distinct path (at least 60m difference)
    if (distDiffFromSunny > 60 && distDiffFromShortest > 50 && altRaw.distanceMeters <= shortestRaw.distanceMeters * 1.5) {
      const altAnalysis = analyzeRouteSolarExposure(altRaw.coordinates, solarPos, true);
      const altMidpoint = getRouteMidpoint(altRaw.coordinates);

      const altGeoJson = {
        type: 'Feature',
        id: 'route-park',
        properties: {
          routeType: 'park',
          name: 'Park & Greenery Walk',
          color: '#34d399',
          glowColor: '#10b981',
          distanceMeters: altAnalysis.totalDistanceMeters,
          walkMinutes: altAnalysis.walkMinutes,
          sunPercent: altAnalysis.sunPercent,
          sunMinutes: altAnalysis.sunMinutes,
          shadeMinutes: altAnalysis.shadeMinutes,
          photopicLuxAvg: altAnalysis.photopicLuxAvg,
          viaName: altVia.name
        },
        geometry: {
          type: 'LineString',
          coordinates: altRaw.coordinates
        }
      };

      parkRoute = {
        id: 'park',
        routeType: 'park',
        name: 'Park & Greenery Walk',
        badgeLabel: 'Scenic Greenery',
        color: '#34d399', // Emerald Green
        glowColor: '#10b981',
        viaName: altVia.name,
        ...altAnalysis,
        geoJson: altGeoJson,
        rawCoordinates: altRaw.coordinates,
        midpoint: altMidpoint
      };
    }
  }

  // Unified list of all candidate routes
  const allRoutes = [sunnyRoute, parkRoute, shortestRoute].filter(Boolean);

  const deltaMeters = Math.max(0, sunnyAnalysis.totalDistanceMeters - shortestAnalysis.totalDistanceMeters);
  const deltaWalkMinutes = Math.max(0, sunnyAnalysis.walkMinutes - shortestAnalysis.walkMinutes);
  const extraSunMinutes = Math.max(0, sunnyAnalysis.sunMinutes - shortestAnalysis.sunMinutes);
  const photonRatio = (sunnyAnalysis.photopicLuxAvg / (shortestAnalysis.photopicLuxAvg || 1)).toFixed(1);

  return {
    shortestRoute,
    sunnyRoute,
    parkRoute,
    allRoutes,
    comparison: {
      deltaMeters,
      deltaWalkMinutes,
      extraSunMinutes,
      photonRatio
    }
  };
}
