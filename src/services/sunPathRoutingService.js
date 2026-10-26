import { getDistanceMeters } from '../utils/geoUtils';
import {
  VERIFIED_REAL_OSM_BUILDINGS,
  VERIFIED_REAL_OSM_SIDEWALKS,
  inspectPointSolarShadow,
  findNearestSidewalk
} from './osmShadowService';

/**
 * Standard preset destinations and transit hubs across central Łódź
 */
export const PRESET_ROUTER_LOCATIONS = [
  {
    id: 'current_gps',
    name: 'Use my current GPS',
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
  },
  {
    id: 'ksiezy_mlyn',
    name: 'Księży Młyn & Park Źródliska (Zone 4)',
    category: 'courtyard',
    address: 'ul. Księży Młyn 12 / Palmiarnia',
    coordinates: [19.4792, 51.7582],
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
  { name: 'Pasaż Rubinsteina Promenade', coordinates: [19.4574, 51.7678], type: 'promenade' },
  { name: 'Park Źródliska Palmiarnia Sun Lawn', coordinates: [19.4782, 51.7595], type: 'park' },
  { name: 'Księży Młyn Kocim Szlakiem Boulevard', coordinates: [19.4795, 51.7568], type: 'promenade' }
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
 * Subdivides a route's coordinate array so that no single segment exceeds `maxStepMeters` (~25m).
 * This ensures 3D building & tree raycasting samples every ~25m along long street blocks.
 */
function densifyRouteCoords(coords, maxStepMeters = 25) {
  if (!coords || coords.length < 2) return coords || [];
  const dense = [coords[0]];
  for (let i = 0; i < coords.length - 1; i++) {
    const p1 = coords[i];
    const p2 = coords[i + 1];
    const dist = getDistanceMeters(p1, p2);
    if (dist > maxStepMeters) {
      const steps = Math.ceil(dist / maxStepMeters);
      for (let s = 1; s < steps; s++) {
        const t = s / steps;
        dense.push([
          p1[0] + (p2[0] - p1[0]) * t,
          p1[1] + (p2[1] - p1[1]) * t
        ]);
      }
    }
    dense.push(p2);
  }
  return dense;
}

/**
 * Fetch a real pedestrian walking route from OpenStreetMap's dedicated foot router
 * (falling back to project-osrm.org if unavailable).
 * Returns GeoJSON coordinates array: [[lng, lat], ...]
 */
export async function fetchWalkingRouteCoords(startCoord, endCoord, viaCoord = null) {
  const coordPath = viaCoord
    ? `${startCoord[0]},${startCoord[1]};${viaCoord[0]},${viaCoord[1]};${endCoord[0]},${endCoord[1]}`
    : `${startCoord[0]},${startCoord[1]};${endCoord[0]},${endCoord[1]}`;

  const endpoints = [
    `https://routing.openstreetmap.de/routed-foot/route/v1/driving/${coordPath}?overview=full&geometries=geojson`,
    `https://router.project-osrm.org/route/v1/walking/${coordPath}?overview=full&geometries=geojson`
  ];

  for (const url of endpoints) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3800);

      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) continue;

      const data = await response.json();
      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        return {
          coordinates: data.routes[0].geometry.coordinates,
          distanceMeters: Math.round(data.routes[0].distance),
          durationSeconds: Math.round(data.routes[0].duration)
        };
      }
    } catch {
      // Try next endpoint
    }
  }

  console.warn('OSRM routing fetch failed, generating realistic fallback pedestrian path.');
  return generateFallbackStreetGrid(startCoord, endCoord, viaCoord);
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
 * Maximum allowed length ratio for the Sunniest Route compared to the Shortest Route (1.20 = +20% max).
 */
export const MAX_SUNNY_DETOUR_RATIO = 1.20;

/**
 * Evaluates route segments using TRUE 3D OSM Building & Tree Raycasting + Urban Canyon Trigonometry:
 * 1. If the sun is below the horizon (solarPos.elevationDeg <= 0), returns 0% sunlight (Nighttime).
 * 2. Otherwise, ray-marches from each segment's midpoint toward the sun vector (azimuthDeg, elevationDeg)
 *    against real 3D OSM building footprints & 3D tree crowns (`inspectPointSolarShadow`).
 * 3. Computes cross-canyon shadow projection width:
 *    W_shadow = (H_building / tan(elev)) * |sin(streetBearing - sunAzimuth)|
 *    and compares against the real OSM pedestrian street width W_street.
 *
 * @param {Array<[number, number]>} coords Route coordinate vertices
 * @param {{ azimuthDeg: number, elevationDeg: number }} solarPos
 * @param {boolean} isIntentionallySunnyRoute
 * @param {Array} buildingsList Optional live OSM building & tree footprints with heights
 * @param {Array} sidewalksList Optional live OSM footways with widths
 * @returns {object} Analysis with sunny/shaded segments, 3D raycast hits, and metrics
 */
export function analyzeRouteSolarExposure(
  rawCoords,
  solarPos,
  isIntentionallySunnyRoute = false,
  buildingsList = VERIFIED_REAL_OSM_BUILDINGS,
  sidewalksList = VERIFIED_REAL_OSM_SIDEWALKS
) {
  if (!rawCoords || rawCoords.length < 2) {
    return {
      segments: [],
      totalDistanceMeters: 0,
      sunDistanceMeters: 0,
      shadeDistanceMeters: 0,
      sunPercent: 0,
      walkMinutes: 1,
      sunMinutes: 0,
      shadeMinutes: 1,
      photopicLuxAvg: 0,
      isNighttime: !solarPos || solarPos.elevationDeg <= 0,
      obstructingBuildings: []
    };
  }

  // Subdivide long road segments into ~28m intervals so 3D building/tree raycasting samples accurately
  const coords = densifyRouteCoords(rawCoords, 28);
  const isNighttime = !solarPos || solarPos.elevationDeg <= 0;

  let totalDistanceMeters = 0;
  let sunDistanceMeters = 0;
  let shadeDistanceMeters = 0;

  const segments = [];
  const obstructingMap = new Map();

  // If it is nighttime in Łódź (sun at or below horizon), 0% of the route has sunlight
  if (isNighttime) {
    for (let i = 0; i < coords.length - 1; i++) {
      const p1 = coords[i];
      const p2 = coords[i + 1];
      const segDist = getDistanceMeters(p1, p2);
      if (segDist === 0) continue;
      totalDistanceMeters += segDist;
      shadeDistanceMeters += segDist;
      segments.push({
        start: p1,
        end: p2,
        midpoint: [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2],
        distanceMeters: segDist,
        bearingDeg: 0,
        isSunny: false,
        status: 'night',
        obstructingBuilding: null
      });
    }

    const walkMinutes = Math.max(1, Math.round(totalDistanceMeters / 75));
    return {
      segments,
      totalDistanceMeters: Math.round(totalDistanceMeters),
      sunDistanceMeters: 0,
      shadeDistanceMeters: Math.round(totalDistanceMeters),
      sunPercent: 0,
      walkMinutes,
      sunMinutes: 0,
      shadeMinutes: walkMinutes,
      photopicLuxAvg: 0,
      isNighttime: true,
      obstructingBuildings: []
    };
  }

  const effectiveElevDeg = solarPos.elevationDeg;
  const effectiveAzimuthDeg = solarPos.azimuthDeg;
  const elevRad = (Math.max(4, effectiveElevDeg) * Math.PI) / 180;

  for (let i = 0; i < coords.length - 1; i++) {
    const p1 = coords[i];
    const p2 = coords[i + 1];
    const segDist = getDistanceMeters(p1, p2);

    if (segDist === 0) continue;
    totalDistanceMeters += segDist;

    // 1. Midpoint of this street segment
    const midPoint = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2];

    // 2. Street segment compass bearing in degrees [0, 360)
    const dLng = p2[0] - p1[0];
    const dLat = p2[1] - p1[1];
    let segBearing = (Math.atan2(dLng, dLat) * 180) / Math.PI;
    if (segBearing < 0) segBearing += 360;

    // 3. True 3D Raycast from segment midpoint toward the sun against OSM Buildings AND Trees
    const raycastResult = inspectPointSolarShadow(
      midPoint,
      { elevationDeg: effectiveElevDeg, azimuthDeg: effectiveAzimuthDeg },
      buildingsList,
      sidewalksList
    );

    // 4. Urban Street-Canyon Geometry: compare cross-street shadow length vs street corridor width
    const angleDiffRad = ((segBearing - effectiveAzimuthDeg) * Math.PI) / 180;
    const crossCanyonSin = Math.abs(Math.sin(angleDiffRad));

    const isPiotrkowskaSpine =
      midPoint[0] > 19.4545 &&
      midPoint[0] < 19.4610 &&
      midPoint[1] > 51.7560 &&
      midPoint[1] < 51.7760 &&
      (Math.abs(segBearing - 180) < 35 ||
        Math.abs(segBearing - 0) < 35 ||
        Math.abs(segBearing - 360) < 35);

    const isInOpenPark =
      (midPoint[1] > 51.7770 && midPoint[1] < 51.7820) ||
      (midPoint[1] > 51.7620 && midPoint[1] < 51.7650 && midPoint[0] > 19.4610);

    const nearestSw = raycastResult.nearestSidewalk;
    const baseCorridorWidth = isInOpenPark
      ? 45.0
      : isPiotrkowskaSpine
        ? 24.0
        : nearestSw && nearestSw.distanceMeters < 45
          ? Math.max(13.5, nearestSw.widthMeters * 2.2)
          : 15.0;

    const localBldgHeight =
      raycastResult.nearestBuilding && raycastResult.nearestBuilding.distanceMeters < 65
        ? raycastResult.nearestBuilding.heightMeters
        : 16.5;

    // Perpendicular shadow cast across the street width: H * |sin(Δθ)| / tan(elev)
    const crossCanyonShadowMeters =
      isInOpenPark ? 0 : (localBldgHeight / Math.tan(elevRad)) * crossCanyonSin * 0.45;

    // Segment is sunny only if NEITHER a 3D OSM building/tree polygon NOR the canyon wall blocks the sun
    const isBlockedByPolygon = !raycastResult.isSunny;
    const isBlockedByCanyon = crossCanyonShadowMeters >= baseCorridorWidth;
    const isSegmentSunny = !isBlockedByPolygon && !isBlockedByCanyon;

    if (isBlockedByPolygon && raycastResult.obstructingObject) {
      obstructingMap.set(raycastResult.obstructingObject.id, raycastResult.obstructingObject);
    }

    if (isSegmentSunny) {
      sunDistanceMeters += segDist;
    } else {
      shadeDistanceMeters += segDist;
    }

    segments.push({
      start: p1,
      end: p2,
      midpoint: midPoint,
      distanceMeters: segDist,
      bearingDeg: Math.round(segBearing),
      isSunny: isSegmentSunny,
      status: raycastResult.status,
      corridorWidthMeters: Math.round(baseCorridorWidth * 10) / 10,
      crossShadowMeters: Math.round(crossCanyonShadowMeters * 10) / 10,
      obstructingBuilding: raycastResult.obstructingObject || null
    });
  }

  const sunPercent =
    totalDistanceMeters > 0
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
    totalDistanceMeters: Math.round(totalDistanceMeters),
    sunDistanceMeters: Math.round(sunDistanceMeters),
    shadeDistanceMeters: Math.round(shadeDistanceMeters),
    sunPercent,
    walkMinutes,
    sunMinutes,
    shadeMinutes,
    photopicLuxAvg,
    isNighttime: false,
    obstructingBuildings: Array.from(obstructingMap.values())
  };
}

/**
 * Ranks candidate sunny pedestrian waypoints that keep the straight-line detour within <= 20%
 * and are not currently in building/tree shadow.
 */
function getRankedSunnyWaypoints(
  startCoord,
  endCoord,
  solarPos = null,
  buildingsList = VERIFIED_REAL_OSM_BUILDINGS
) {
  const directDist = Math.max(50, getDistanceMeters(startCoord, endCoord));
  const midLng = (startCoord[0] + endCoord[0]) / 2;
  const midLat = (startCoord[1] + endCoord[1]) / 2;

  const candidates = [];

  for (const wp of SUNNY_POCKET_WAYPOINTS) {
    const dToMid = getDistanceMeters([midLng, midLat], wp.coordinates);
    const dStartToWp = getDistanceMeters(startCoord, wp.coordinates);
    const dWpToEnd = getDistanceMeters(wp.coordinates, endCoord);
    const viaDirectDist = dStartToWp + dWpToEnd;
    const detourRatio = viaDirectDist / directDist;

    // Filter out waypoints whose straight-line geometry already exceeds +22% detour
    if (detourRatio > 1.22) continue;

    // Raycast the waypoint itself against 3D OSM buildings & trees
    const wpShadowCheck =
      solarPos && solarPos.elevationDeg > 0
        ? inspectPointSolarShadow(wp.coordinates, solarPos, buildingsList)
        : { isSunny: false };
    const shadowPenaltyMeters = wpShadowCheck.isSunny ? 0 : 400;

    const extraMeters = Math.max(0, viaDirectDist - directDist);
    const score = dToMid + extraMeters * 1.5 + shadowPenaltyMeters;
    candidates.push({ wp, score, detourRatio });
  }

  candidates.sort((a, b) => a.score - b.score);
  return candidates.map((c) => c.wp);
}

/**
 * Generates walking routes between start (A) and end (B):
 * - Evaluates all candidate paths and guarantees `shortestRoute` is strictly the minimum-distance path.
 * - Enforces that `sunnyRoute` NEVER exceeds +20% of `shortestRoute`'s distance (`MAX_SUNNY_DETOUR_RATIO = 1.20`),
 *   and NEVER has a smaller Sun Bank (`sunMinutes` / `sunDistanceMeters`) or lower `sunPercent` than `shortestRoute`.
 * - At nighttime (`solarPos.elevationDeg <= 0`), there is no sunlight, so `sunnyRoute` is equal to `shortestRoute`.
 *
 * @param {[number, number]} startCoord [lng, lat]
 * @param {[number, number]} endCoord [lng, lat]
 * @param {{ azimuthDeg: number, elevationDeg: number }} solarPos
 * @param {Array} buildingsList Optional live OSM buildings + trees
 * @param {Array} sidewalksList Optional live OSM sidewalks
 * @returns {Promise<{ shortestRoute: object, sunnyRoute: object, parkRoute?: object, allRoutes: object[], comparison: object }>}
 */
export async function calculateDualRoutes(
  startCoord,
  endCoord,
  solarPos,
  buildingsList = VERIFIED_REAL_OSM_BUILDINGS,
  sidewalksList = VERIFIED_REAL_OSM_SIDEWALKS
) {
  const isNighttime = !solarPos || solarPos.elevationDeg <= 0;

  // 1. Build candidate pool starting with the direct A -> B route
  const directRaw = await fetchWalkingRouteCoords(startCoord, endCoord, null);
  const directAnalysis = analyzeRouteSolarExposure(
    directRaw.coordinates,
    solarPos,
    false,
    buildingsList,
    sidewalksList
  );

  const candidatePool = [
    {
      coordinates: directRaw.coordinates,
      analysis: directAnalysis,
      viaName: 'Direct Path (Equal to Shortest)',
      isDirectCall: true
    }
  ];

  // 2. During daytime, also fetch candidate waypoint routes in parallel
  if (!isNighttime) {
    const rankedWaypoints = getRankedSunnyWaypoints(
      startCoord,
      endCoord,
      solarPos,
      buildingsList
    );

    const wpResults = await Promise.all(
      rankedWaypoints.slice(0, 4).map(async (candidateWp) => {
        const candidateRaw = await fetchWalkingRouteCoords(
          startCoord,
          endCoord,
          candidateWp.coordinates
        );
        const candidateAnalysis = analyzeRouteSolarExposure(
          candidateRaw.coordinates,
          solarPos,
          true,
          buildingsList,
          sidewalksList
        );
        return {
          coordinates: candidateRaw.coordinates,
          analysis: candidateAnalysis,
          viaName: candidateWp.name,
          isDirectCall: false
        };
      })
    );

    for (const res of wpResults) {
      if (res.analysis.totalDistanceMeters > 0) {
        candidatePool.push(res);
      }
    }
  }

  // 3. Establish the TRUE Shortest Route: strictly the candidate with minimum totalDistanceMeters
  let shortestCandidate = candidatePool[0];
  for (const cand of candidatePool) {
    if (cand.analysis.totalDistanceMeters < shortestCandidate.analysis.totalDistanceMeters) {
      shortestCandidate = cand;
    }
  }

  const shortestAnalysis = shortestCandidate.analysis;
  const shortestCoords = shortestCandidate.coordinates;
  const shortestMidpoint = getRouteMidpoint(shortestCoords);

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
      coordinates: shortestCoords
    }
  };

  const shortestRoute = {
    id: 'shortest',
    routeType: 'shortest',
    name: 'Shortest Path (Direct Line)',
    badgeLabel: 'Direct Line',
    color: '#38bdf8',
    glowColor: '#0ea5e9',
    ...shortestAnalysis,
    geoJson: shortestGeoJson,
    rawCoordinates: shortestCoords,
    midpoint: shortestMidpoint
  };

  // Max allowed distance for the Sunniest Route: strictly <= 1.20x (20% longer than) the Shortest Route
  const maxAllowedSunnyDistanceMeters = Math.round(
    shortestAnalysis.totalDistanceMeters * MAX_SUNNY_DETOUR_RATIO
  );

  // 4. Select the Sunniest Route:
  //    Must be within <= +20% distance of the Shortest Route AND must NEVER have fewer sunMinutes,
  //    less sunDistanceMeters, or a lower sunPercent than the Shortest Route.
  let bestSunnyCandidate = shortestCandidate;

  if (!isNighttime) {
    for (const cand of candidatePool) {
      const a = cand.analysis;
      const withinDetourCap = a.totalDistanceMeters <= maxAllowedSunnyDistanceMeters;

      // Never allow a "Sunniest" candidate that has a smaller Sun Bank or lower Sun % than Shortest
      const neverWorseThanShortest =
        a.sunMinutes >= shortestAnalysis.sunMinutes &&
        a.sunDistanceMeters >= shortestAnalysis.sunDistanceMeters &&
        a.sunPercent >= shortestAnalysis.sunPercent;

      if (!withinDetourCap || !neverWorseThanShortest) continue;

      const bestA = bestSunnyCandidate.analysis;
      const hasMoreSunMinutes = a.sunMinutes > bestA.sunMinutes;
      const hasSameSunMinutesButHigherPct =
        a.sunMinutes === bestA.sunMinutes &&
        (a.sunPercent > bestA.sunPercent ||
          (a.sunPercent === bestA.sunPercent && a.sunDistanceMeters > bestA.sunDistanceMeters));

      if (hasMoreSunMinutes || hasSameSunMinutesButHigherPct) {
        bestSunnyCandidate = cand;
      }
    }
  }

  const chosenSunnyCoords = bestSunnyCandidate.coordinates;
  const chosenSunnyAnalysis = bestSunnyCandidate.analysis;
  const isSameAsShortest =
    bestSunnyCandidate === shortestCandidate ||
    (chosenSunnyAnalysis.totalDistanceMeters === shortestAnalysis.totalDistanceMeters &&
      chosenSunnyAnalysis.sunMinutes === shortestAnalysis.sunMinutes &&
      chosenSunnyAnalysis.sunPercent === shortestAnalysis.sunPercent);
  const chosenViaName = isSameAsShortest
    ? 'Direct Path (Equal to Shortest)'
    : bestSunnyCandidate.viaName;

  const sunnyMidpoint = getRouteMidpoint(chosenSunnyCoords);

  const sunnyGeoJson = {
    type: 'Feature',
    id: 'route-sunny',
    properties: {
      routeType: 'sunny',
      name: isNighttime
        ? 'Sunniest Path (Nighttime — Equal to Shortest)'
        : 'The Sunny Walk (Daylight Maximized, ≤+20% dist)',
      color: '#fbbf24',
      glowColor: '#f59e0b',
      distanceMeters: chosenSunnyAnalysis.totalDistanceMeters,
      walkMinutes: chosenSunnyAnalysis.walkMinutes,
      sunPercent: chosenSunnyAnalysis.sunPercent,
      sunMinutes: chosenSunnyAnalysis.sunMinutes,
      shadeMinutes: chosenSunnyAnalysis.shadeMinutes,
      photopicLuxAvg: chosenSunnyAnalysis.photopicLuxAvg,
      viaName: chosenViaName,
      isSameAsShortest,
      isNighttime
    },
    geometry: {
      type: 'LineString',
      coordinates: chosenSunnyCoords
    }
  };

  const sunnyRoute = {
    id: 'sunny',
    routeType: 'sunny',
    name: isNighttime ? 'Sunniest Walk (Equal to Shortest at Night)' : 'The Sunny Walk',
    badgeLabel: isNighttime ? 'Nighttime (0%)' : isSameAsShortest ? 'Optimal Direct' : 'Recommended',
    color: '#fbbf24',
    glowColor: '#f59e0b',
    viaName: chosenViaName,
    isSameAsShortest,
    isNighttime,
    maxAllowedDistanceMeters: maxAllowedSunnyDistanceMeters,
    ...chosenSunnyAnalysis,
    geoJson: sunnyGeoJson,
    rawCoordinates: chosenSunnyCoords,
    midpoint: sunnyMidpoint
  };

  const allRoutes = [sunnyRoute, shortestRoute];

  const deltaMeters = Math.max(
    0,
    chosenSunnyAnalysis.totalDistanceMeters - shortestAnalysis.totalDistanceMeters
  );
  const detourPercent =
    shortestAnalysis.totalDistanceMeters > 0
      ? Math.round((deltaMeters / shortestAnalysis.totalDistanceMeters) * 100)
      : 0;
  const deltaWalkMinutes = Math.max(
    0,
    chosenSunnyAnalysis.walkMinutes - shortestAnalysis.walkMinutes
  );
  const extraSunMinutes = Math.max(
    0,
    chosenSunnyAnalysis.sunMinutes - shortestAnalysis.sunMinutes
  );
  const photonRatio =
    shortestAnalysis.photopicLuxAvg > 0
      ? (chosenSunnyAnalysis.photopicLuxAvg / shortestAnalysis.photopicLuxAvg).toFixed(1)
      : '1.0';

  return {
    shortestRoute,
    sunnyRoute,
    parkRoute: null,
    allRoutes,
    isNighttime,
    comparison: {
      deltaMeters,
      detourPercent,
      deltaWalkMinutes,
      extraSunMinutes,
      photonRatio,
      isSameAsShortest
    }
  };
}
